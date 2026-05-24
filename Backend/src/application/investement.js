import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Asset from "../infastructure/schemas/asset.js";

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

/**
 * ✅ CORE RULE:
 * calculationStartDate = the date interest/commission calculation starts.
 * Every 30 days from that date, customer must pay interest.
 *
 * Example:
 *   calculationStartDate = 2025-05-24
 *   Due dates: 2025-06-24, 2025-07-24, 2025-08-24 ...
 *
 *   calculationStartDate = 2025-06-10, today = 2026-03-05
 *   Due dates passed: 2025-07-10, 2025-08-10 ... 2026-02-10  => 8 cycles past
 *   Next due: 2026-03-10 (not yet arrears for that cycle)
 *
 * completedCycles = number of full 30-day cycles that have PASSED since startDate
 *   i.e. cycles where the due date < now (customer should have already paid)
 */
const completedCycles = (startDate, now = new Date()) => {
  if (!startDate) return 0;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return 0;

  let count = 0;
  const due = new Date(s);
  due.setMonth(due.getMonth() + 1); // first due date = startDate + 30 days (calendar month)

  while (due < now) {
    count++;
    due.setMonth(due.getMonth() + 1);
  }

  return count;
};

/**
 * Payment status for investment list coloring:
 *  - complete  : principal fully paid
 *  - arrears   : missed at least one interest payment cycle
 *  - ongoing   : up to date
 */
const calcPaymentStatus = (inv) => {
  const invAmt = Number(inv?.investmentAmount || 0);
  const principalPaid = Number(inv?.principalPaidAmount || 0);
  const interestPaid = Number(inv?.interestPaidAmount || 0);

  if (principalPaid >= invAmt && invAmt > 0) return "complete";

  const cycles = completedCycles(inv?.startDate);
  const monthInt = (invAmt * Number(inv?.investmentInterestRate || 0)) / 100;
  const totalDueInterest = monthInt * cycles;

  if (cycles > 0 && interestPaid < totalDueInterest) return "arrears";
  if (interestPaid > 0 || cycles === 0) return "ongoing";

  return "ongoing";
};

/**
 * ✅ CREATE INVESTMENT
 * POST /api/investment
 *
 * Body fields:
 *   investmentName, customerNic, brokerNic, assetIds[],
 *   investmentAmount, investmentInterestRate, brokerCommissionRate,
 *   startDate  <-- this IS the calculationStartDate
 *   description
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
          "investmentName, customerNic, brokerNic, assetIds[], investmentAmount, investmentInterestRate, brokerCommissionRate, startDate (calculationStartDate) are required",
      });
    }

    if (!isValidSriLankaNIC(customerNic)) {
      return res.status(400).json({ success: false, message: "Invalid customerNic format" });
    }
    if (!isValidSriLankaNIC(brokerNic)) {
      return res.status(400).json({ success: false, message: "Invalid brokerNic format" });
    }

    for (const id of assetIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: `Invalid assetId: ${id}` });
      }
    }

    const invAmt = toNumberOrFail(investmentAmount);
    if (invAmt === null || invAmt < 0) {
      return res.status(400).json({ success: false, message: "investmentAmount must be >= 0" });
    }

    const intRate = toNumberOrFail(investmentInterestRate);
    if (intRate === null || intRate < 0) {
      return res.status(400).json({ success: false, message: "investmentInterestRate must be >= 0" });
    }

    const commRate = toNumberOrFail(brokerCommissionRate);
    if (commRate === null || commRate < 0) {
      return res.status(400).json({ success: false, message: "brokerCommissionRate must be >= 0" });
    }

    const startDt = toDateOrFail(startDate);
    if (!startDt) {
      return res.status(400).json({ success: false, message: "startDate must be a valid date" });
    }

    const customer = await Customer.findOne({ nic: String(customerNic).trim().toUpperCase() });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found for this NIC" });
    }

    const broker = await Broker.findOne({ nic: String(brokerNic).trim().toUpperCase() });
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found for this NIC" });
    }

    const assets = await Asset.find({ _id: { $in: assetIds } });
    if (assets.length !== assetIds.length) {
      return res.status(404).json({ success: false, message: "One or more assets not found" });
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
      assetIds,
      investmentAmount: invAmt,
      investmentInterestRate: intRate,
      brokerCommissionRate: commRate,
      startDate: startDt, // ✅ calculationStartDate stored here
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
      note: {
        startDate: "This is the calculationStartDate. Interest is due every 30 days from this date.",
        example: `startDate=${startDt.toISOString().slice(0, 10)} → first interest due on ${new Date(new Date(startDt).setMonth(startDt.getMonth() + 1)).toISOString().slice(0, 10)}`,
      },
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

    const now = new Date();

    const withStatus = investments.map((inv) => {
      const cycles = completedCycles(inv.startDate, now);
      const monthInt = (Number(inv.investmentAmount || 0) * Number(inv.investmentInterestRate || 0)) / 100;
      const totalDueInterest = monthInt * cycles;
      const interestPaid = Number(inv.interestPaidAmount || 0);
      const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

      // Next due date
      const nextDue = new Date(inv.startDate);
      nextDue.setMonth(nextDue.getMonth() + cycles + 1);

      return {
        ...inv,
        paymentStatus: calcPaymentStatus(inv),
        cycles,
        totalDueInterest: Number(totalDueInterest.toFixed(2)),
        arrearsInterest: Number(arrearsInterest.toFixed(2)),
        nextDueDate: nextDue,
      };
    });

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
      return res.status(400).json({ success: false, message: "Invalid investment id" });
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
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const now = new Date();
    const cycles = completedCycles(investment.startDate, now);
    const monthInt =
      (Number(investment.investmentAmount || 0) * Number(investment.investmentInterestRate || 0)) / 100;
    const totalDueInterest = monthInt * cycles;
    const interestPaid = Number(investment.interestPaidAmount || 0);
    const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

    const nextDue = new Date(investment.startDate);
    nextDue.setMonth(nextDue.getMonth() + cycles + 1);

    return res.status(200).json({
      success: true,
      data: {
        ...investment,
        paymentStatus: calcPaymentStatus(investment),
        cycles,
        monthlyInterest: Number(monthInt.toFixed(2)),
        totalDueInterest: Number(totalDueInterest.toFixed(2)),
        arrearsInterest: Number(arrearsInterest.toFixed(2)),
        nextDueDate: nextDue,
        note: `Interest due every 30 days from startDate. Completed cycles: ${cycles}`,
      },
    });
  } catch (err) {
    console.error("getInvestmentById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid investment id" });
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

    if (investmentName !== undefined) patch.investmentName = String(investmentName).trim();

    if (investmentAmount !== undefined) {
      const v = toNumberOrFail(investmentAmount);
      if (v === null || v < 0)
        return res.status(400).json({ success: false, message: "investmentAmount must be >= 0" });
      patch.investmentAmount = v;
    }

    if (investmentInterestRate !== undefined) {
      const v = toNumberOrFail(investmentInterestRate);
      if (v === null || v < 0)
        return res.status(400).json({ success: false, message: "investmentInterestRate must be >= 0" });
      patch.investmentInterestRate = v;
    }

    if (brokerCommissionRate !== undefined) {
      const v = toNumberOrFail(brokerCommissionRate);
      if (v === null || v < 0)
        return res.status(400).json({ success: false, message: "brokerCommissionRate must be >= 0" });
      patch.brokerCommissionRate = v;
    }

    if (startDate !== undefined) {
      const d = toDateOrFail(startDate);
      if (!d)
        return res.status(400).json({ success: false, message: "startDate must be a valid date" });
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
      return res.status(404).json({ success: false, message: "Investment not found" });
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

export const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid investment id" });
    }

    const deleted = await Investment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    return res.status(200).json({ success: true, message: "Investment deleted" });
  } catch (err) {
    console.error("deleteInvestment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};