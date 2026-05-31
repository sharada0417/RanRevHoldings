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
 * ✅ FIXED INTEREST SPLIT LOGIC
 *
 * investmentInterestRate = TOTAL rate charged to customer.
 * brokerCommissionRate   = carved OUT of the total (not added on top).
 *
 *   monthlyTotalInterest    = investmentAmount × totalRate / 100
 *   monthlyBrokerCommission = investmentAmount × brokerRate / 100
 *   monthlyOwnerInterest    = investmentAmount × (totalRate - brokerRate) / 100
 *
 * Example:
 *   amount=100000, totalRate=10%, brokerRate=1%
 *   monthlyTotal  = 10,000  (customer pays this)
 *   monthlyBroker =  1,000  (broker earns this)
 *   monthlyOwner  =  9,000  (owner earns this)
 *
 * Arrears: based on TOTAL interest (customer's obligation).
 * Status:
 *   complete  = principal fully paid
 *   arrears   = missed at least one interest cycle
 *   ongoing   = up to date
 */

const completedCycles = (startDate, now = new Date()) => {
  if (!startDate) return 0;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return 0;

  let count = 0;
  const due = new Date(s);
  due.setMonth(due.getMonth() + 1);

  while (due < now) {
    count++;
    due.setMonth(due.getMonth() + 1);
  }

  return count;
};

const calcPaymentStatus = (inv) => {
  const invAmt = Number(inv?.investmentAmount || 0);
  const totalRate = Number(inv?.investmentInterestRate || 0);
  const brokerRate = Number(inv?.brokerCommissionRate || 0);
  const principalPaid = Number(inv?.principalPaidAmount || 0);
  const interestPaid = Number(inv?.interestPaidAmount || 0);

  if (principalPaid >= invAmt && invAmt > 0) return "complete";

  const cycles = completedCycles(inv?.startDate);
  // Use TOTAL rate for arrears check (customer owes the full amount)
  const monthInt = (invAmt * totalRate) / 100;
  const totalDueInterest = monthInt * cycles;

  if (cycles > 0 && interestPaid < totalDueInterest) return "arrears";
  if (interestPaid > 0 || cycles === 0) return "ongoing";

  return "ongoing";
};

/**
 * Build the monthly interest breakdown for response
 */
const buildMonthlyBreakdown = (inv) => {
  const principal = Number(inv.investmentAmount || 0);
  const totalRate = Number(inv.investmentInterestRate || 0);
  const brokerRate = Number(inv.brokerCommissionRate || 0);
  const ownerRate = totalRate - brokerRate;

  return {
    monthlyTotalInterest: Number(((principal * totalRate) / 100).toFixed(2)),
    monthlyBrokerCommission: Number(((principal * brokerRate) / 100).toFixed(2)),
    monthlyOwnerInterest: Number(((principal * ownerRate) / 100).toFixed(2)),
    ownerInterestRate: ownerRate,
  };
};

/**
 * ✅ CREATE INVESTMENT
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

    // ✅ Validate broker rate doesn't exceed total rate
    if (commRate > intRate) {
      return res.status(400).json({
        success: false,
        message: `brokerCommissionRate (${commRate}%) cannot exceed investmentInterestRate (${intRate}%)`,
      });
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

    const breakdown = buildMonthlyBreakdown(populated);
    const ownerRate = intRate - commRate;

    return res.status(201).json({
      success: true,
      message: "Investment created successfully",
      data: populated,
      monthlyBreakdown: {
        investmentInterestRate: intRate,
        brokerCommissionRate: commRate,
        ownerInterestRate: ownerRate,
        monthlyTotalInterest: breakdown.monthlyTotalInterest,
        monthlyBrokerCommission: breakdown.monthlyBrokerCommission,
        monthlyOwnerInterest: breakdown.monthlyOwnerInterest,
      },
      note: {
        startDate: "This is the calculationStartDate. Interest is due every 30 days from this date.",
        example: `amount=${invAmt}, totalRate=${intRate}%, brokerRate=${commRate}%, ownerRate=${ownerRate}% → customer pays ${breakdown.monthlyTotalInterest}/month (broker gets ${breakdown.monthlyBrokerCommission}, owner gets ${breakdown.monthlyOwnerInterest})`,
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
      const principal = Number(inv.investmentAmount || 0);
      const totalRate = Number(inv.investmentInterestRate || 0);
      const brokerRate = Number(inv.brokerCommissionRate || 0);
      const ownerRate = totalRate - brokerRate;

      const monthlyTotalInterest = (principal * totalRate) / 100;
      const monthlyBrokerCommission = (principal * brokerRate) / 100;
      const monthlyOwnerInterest = (principal * ownerRate) / 100;

      const cycles = completedCycles(inv.startDate, now);
      const totalDueInterest = monthlyTotalInterest * cycles;
      const interestPaid = Number(inv.interestPaidAmount || 0);
      const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

      const nextDue = new Date(inv.startDate);
      nextDue.setMonth(nextDue.getMonth() + cycles + 1);

      return {
        ...inv,
        paymentStatus: calcPaymentStatus(inv),
        ownerInterestRate: ownerRate,
        monthlyTotalInterest: Number(monthlyTotalInterest.toFixed(2)),
        monthlyBrokerCommission: Number(monthlyBrokerCommission.toFixed(2)),
        monthlyOwnerInterest: Number(monthlyOwnerInterest.toFixed(2)),
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
    const principal = Number(investment.investmentAmount || 0);
    const totalRate = Number(investment.investmentInterestRate || 0);
    const brokerRate = Number(investment.brokerCommissionRate || 0);
    const ownerRate = totalRate - brokerRate;

    const monthlyTotalInterest = (principal * totalRate) / 100;
    const monthlyBrokerCommission = (principal * brokerRate) / 100;
    const monthlyOwnerInterest = (principal * ownerRate) / 100;

    const cycles = completedCycles(investment.startDate, now);
    const totalDueInterest = monthlyTotalInterest * cycles;
    const interestPaid = Number(investment.interestPaidAmount || 0);
    const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

    const nextDue = new Date(investment.startDate);
    nextDue.setMonth(nextDue.getMonth() + cycles + 1);

    return res.status(200).json({
      success: true,
      data: {
        ...investment,
        paymentStatus: calcPaymentStatus(investment),
        ownerInterestRate: ownerRate,
        monthlyTotalInterest: Number(monthlyTotalInterest.toFixed(2)),
        monthlyBrokerCommission: Number(monthlyBrokerCommission.toFixed(2)),
        monthlyOwnerInterest: Number(monthlyOwnerInterest.toFixed(2)),
        cycles,
        totalDueInterest: Number(totalDueInterest.toFixed(2)),
        arrearsInterest: Number(arrearsInterest.toFixed(2)),
        nextDueDate: nextDue,
        note: `Interest split: customer pays ${monthlyTotalInterest.toFixed(2)}/month (owner: ${monthlyOwnerInterest.toFixed(2)}, broker: ${monthlyBrokerCommission.toFixed(2)}). Completed cycles: ${cycles}`,
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

    // ✅ Validate that broker rate doesn't exceed total rate after update
    const existing = await Investment.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const finalTotalRate =
      patch.investmentInterestRate !== undefined
        ? patch.investmentInterestRate
        : existing.investmentInterestRate;
    const finalBrokerRate =
      patch.brokerCommissionRate !== undefined
        ? patch.brokerCommissionRate
        : existing.brokerCommissionRate;

    if (finalBrokerRate > finalTotalRate) {
      return res.status(400).json({
        success: false,
        message: `brokerCommissionRate (${finalBrokerRate}%) cannot exceed investmentInterestRate (${finalTotalRate}%)`,
      });
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

    const breakdown = buildMonthlyBreakdown(updated);

    return res.status(200).json({
      success: true,
      message: "Investment updated",
      data: {
        ...updated,
        paymentStatus: calcPaymentStatus(updated),
        ownerInterestRate: breakdown.ownerInterestRate,
        monthlyTotalInterest: breakdown.monthlyTotalInterest,
        monthlyBrokerCommission: breakdown.monthlyBrokerCommission,
        monthlyOwnerInterest: breakdown.monthlyOwnerInterest,
      },
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