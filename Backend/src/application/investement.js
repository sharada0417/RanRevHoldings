import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Asset from "../infastructure/schemas/asset.js";

/**
 * NIC formats supported:
 *  - 12 digits
 *  - 11 digits + V/X
 *  - 9 digits + V/X
 */
const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

const toNumberOrFail = (val) => {
  const num = Number(val);
  if (Number.isNaN(num)) return null;
  return num;
};

const toDateOrFail = (val) => {
  const d = new Date(val);
  if (!val || Number.isNaN(d.getTime())) return null;
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // keep same day when possible (avoid month overflow weirdness)
  if (d.getDate() !== day) {
    d.setDate(0); // last day of previous month
  }
  return d;
};

const calcPaymentStatus = (inv) => {
  const invAmt = Number(inv?.investmentAmount || 0);
  const principalPaid = Number(inv?.principalPaidAmount || 0);
  const interestPaid = Number(inv?.interestPaidAmount || 0);
  const startDate = inv?.startDate ? new Date(inv.startDate) : null;

  // ✅ COMPLETE: principal fully paid (investment amount)
  if (principalPaid >= invAmt && invAmt > 0) return "complete";

  // ✅ ARREARS: customer didn't pay interest after 1 month from startDate
  // (You said: if investment start is 2026-01-02, arrears should start after 2026-02-02)
  const due = startDate ? addMonths(startDate, 1) : null;
  const now = new Date();
  if (due && now > due && interestPaid <= 0) return "arrears";

  // ✅ ONGOING: customer paid interest (not arrears), but principal not fully paid
  if (interestPaid > 0 && principalPaid < invAmt) return "ongoing";

  // default (new investment)
  return "ongoing";
};

/**
 * ✅ CREATE ONE INVESTMENT WITH MULTIPLE ASSETS
 * POST /api/investment
 */
export const createInvestment = async (req, res) => {
  try {
    const {
      investmentName,
      customerNic,
      brokerNic,
      assetIds,
      investmentAmount,
      investmentInterestRate,
      brokerCommissionRate,
      startDate,
      description,
    } = req.body || {};

    if (
      !investmentName ||
      !customerNic ||
      !brokerNic ||
      !Array.isArray(assetIds) ||
      assetIds.length === 0 ||
      investmentAmount === undefined ||
      investmentInterestRate === undefined ||
      brokerCommissionRate === undefined ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "investmentName, customerNic, brokerNic, assetIds[], investmentAmount, investmentInterestRate, brokerCommissionRate, startDate are required",
      });
    }

    if (!isValidSriLankaNIC(customerNic)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customerNic format" });
    }
    if (!isValidSriLankaNIC(brokerNic)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid brokerNic format" });
    }

    for (const id of assetIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid assetId: ${id}` });
      }
    }

    const invAmt = toNumberOrFail(investmentAmount);
    if (invAmt === null || invAmt < 0) {
      return res.status(400).json({
        success: false,
        message: "investmentAmount must be a valid number and >= 0",
      });
    }

    const intRate = toNumberOrFail(investmentInterestRate);
    if (intRate === null || intRate < 0) {
      return res.status(400).json({
        success: false,
        message: "investmentInterestRate must be a valid number and >= 0",
      });
    }

    const commRate = toNumberOrFail(brokerCommissionRate);
    if (commRate === null || commRate < 0) {
      return res.status(400).json({
        success: false,
        message: "brokerCommissionRate must be a valid number and >= 0",
      });
    }

    const startDt = toDateOrFail(startDate);
    if (!startDt) {
      return res
        .status(400)
        .json({ success: false, message: "startDate must be a valid date" });
    }

    const customer = await Customer.findOne({
      nic: String(customerNic).trim().toUpperCase(),
    });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found for this NIC" });
    }

    const broker = await Broker.findOne({
      nic: String(brokerNic).trim().toUpperCase(),
    });
    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found for this NIC" });
    }

    const assets = await Asset.find({ _id: { $in: assetIds } });
    if (assets.length !== assetIds.length) {
      return res
        .status(404)
        .json({ success: false, message: "One or more assets not found" });
    }

    for (const a of assets) {
      if (a.customerId && String(a.customerId) !== String(customer._id)) {
        return res.status(400).json({
          success: false,
          message: `Asset "${a.assetName}" does not belong to the provided customer`,
        });
      }
    }

    const created = await Investment.create({
      investmentName: String(investmentName).trim(),
      customerId: customer._id,
      brokerId: broker._id,
      assetIds: assetIds,
      investmentAmount: invAmt,
      investmentInterestRate: intRate,
      brokerCommissionRate: commRate,
      startDate: startDt,
      description: description ? String(description).trim() : "",
    });

    const populated = await Investment.findById(created._id)
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetIds",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress createdAt isReleased"
      );

    return res.status(201).json({
      success: true,
      message: "Investment created successfully",
      data: populated,
    });
  } catch (err) {
    console.error("createInvestment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllInvestments = async (req, res) => {
  try {
    const investments = await Investment.find()
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetIds",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress createdAt isReleased"
      )
      .sort({ createdAt: -1 })
      .lean();

    // ✅ add paymentStatus for frontend colors
    const withStatus = investments.map((inv) => ({
      ...inv,
      paymentStatus: calcPaymentStatus(inv), // complete | arrears | ongoing
    }));

    return res.status(200).json({ success: true, data: withStatus });
  } catch (err) {
    console.error("getAllInvestments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getInvestmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid investment id" });
    }

    const investment = await Investment.findById(id)
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetIds",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress createdAt isReleased"
      )
      .lean();

    if (!investment) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    return res.status(200).json({
      success: true,
      data: { ...investment, paymentStatus: calcPaymentStatus(investment) },
    });
  } catch (err) {
    console.error("getInvestmentById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ UPDATE investment basic fields (no asset change here)
 * PUT /api/investment/:id
 */
export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid investment id" });
    }

    const {
      investmentName,
      investmentAmount,
      investmentInterestRate,
      brokerCommissionRate,
      startDate,
      description,
    } = req.body || {};

    const patch = {};

    if (investmentName !== undefined)
      patch.investmentName = String(investmentName).trim();

    if (investmentAmount !== undefined) {
      const v = toNumberOrFail(investmentAmount);
      if (v === null || v < 0) {
        return res.status(400).json({
          success: false,
          message: "investmentAmount must be a valid number and >= 0",
        });
      }
      patch.investmentAmount = v;
    }

    if (investmentInterestRate !== undefined) {
      const v = toNumberOrFail(investmentInterestRate);
      if (v === null || v < 0) {
        return res.status(400).json({
          success: false,
          message: "investmentInterestRate must be a valid number and >= 0",
        });
      }
      patch.investmentInterestRate = v;
    }

    if (brokerCommissionRate !== undefined) {
      const v = toNumberOrFail(brokerCommissionRate);
      if (v === null || v < 0) {
        return res.status(400).json({
          success: false,
          message: "brokerCommissionRate must be a valid number and >= 0",
        });
      }
      patch.brokerCommissionRate = v;
    }

    if (startDate !== undefined) {
      const d = toDateOrFail(startDate);
      if (!d) {
        return res
          .status(400)
          .json({ success: false, message: "startDate must be a valid date" });
      }
      patch.startDate = d;
    }

    if (description !== undefined)
      patch.description = description ? String(description).trim() : "";

    const updated = await Investment.findByIdAndUpdate(id, patch, { new: true })
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetIds",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress createdAt isReleased"
      )
      .lean();

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Investment updated",
      data: { ...updated, paymentStatus: calcPaymentStatus(updated) },
    });
  } catch (err) {
    console.error("updateInvestment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ DELETE investment
 * DELETE /api/investment/:id
 */
export const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid investment id" });
    }

    const deleted = await Investment.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    return res.status(200).json({ success: true, message: "Investment deleted" });
  } catch (err) {
    console.error("deleteInvestment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
