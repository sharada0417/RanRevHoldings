import mongoose from "mongoose";
import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Asset from "../infastructure/schemas/asset.js";
import Investment from "../infastructure/schemas/investement.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

const safeNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * ✅ CORE: monthly interest = principal * (rate / 100)
 */
const monthlyInterest = (principal, ratePercent) => {
  const p = safeNum(principal, 0);
  const r = safeNum(ratePercent, 0);
  return Math.max((p * r) / 100, 0);
};

/**
 * ✅ CORE CYCLE RULE:
 *
 * startDate = calculationStartDate (when interest starts accruing).
 * Every calendar month from startDate, one interest payment is due.
 *
 * completedCycles = number of due dates that have already PASSED.
 * (due date = startDate + N months, where due date < now)
 *
 * Example:
 *   startDate = 2025-06-10, now = 2026-03-05
 *   due dates: 2025-07-10 ✓, 2025-08-10 ✓, ... 2026-02-10 ✓  → 8 cycles
 *   next due:  2026-03-10 (not past yet → not arrears for that cycle)
 *
 *   startDate = 2025-05-24, now = 2025-06-20
 *   2025-06-24 not passed yet → 0 cycles → no arrears
 *
 *   startDate = 2025-05-24, now = 2025-06-25
 *   2025-06-24 passed → 1 cycle → 1 interest due
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

/**
 * Returns the next due date (first upcoming due date >= now)
 */
const nextDueDate = (startDate, now = new Date()) => {
  if (!startDate) return null;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return null;

  const due = new Date(s);
  due.setMonth(due.getMonth() + 1);

  while (due < now) {
    due.setMonth(due.getMonth() + 1);
  }

  return due;
};

/**
 * Full investment calculation numbers based on 30-day cycle rule
 */
const calcInvestmentNumbers = (inv, now = new Date()) => {
  const principal = safeNum(inv.investmentAmount, 0);
  const rate = safeNum(inv.investmentInterestRate, 0);

  const monthInt = monthlyInterest(principal, rate);
  const cycles = completedCycles(inv.startDate, now);

  // Total interest that SHOULD have been paid by now (all past due dates)
  const totalDueInterest = monthInt * cycles;

  const interestPaid = safeNum(inv.interestPaidAmount, 0);

  // Arrears = unpaid interest from past due cycles only
  const arrearsInterest = Math.max(totalDueInterest - interestPaid, 0);

  const principalPaid = safeNum(inv.principalPaidAmount, 0);
  const principalPending =
    inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
      ? Math.max(principal - principalPaid, 0)
      : Math.max(safeNum(inv.remainingPendingAmount, 0), 0);

  const arrearsMonthsCount =
    arrearsInterest > 0 && monthInt > 0 ? Math.ceil(arrearsInterest / monthInt) : 0;

  let status = "pending";
  if (principalPending <= 0 && arrearsInterest <= 0) status = "complete";
  else if (arrearsInterest > 0) status = "arrears";
  else status = "pending";

  const next = nextDueDate(inv.startDate, now);

  return {
    principal,
    rate,
    monthlyInterest: monthInt,
    cycles,
    totalDueInterest,
    interestPaidAmount: interestPaid,
    arrearsInterest,
    principalPending,
    arrearsMonthsCount,
    nextDueDate: next,
    status,
  };
};

const getCustomerTotalPaidMap = async (customerIds) => {
  const agg = await CustomerPayment.aggregate([
    { $match: { customerId: { $in: customerIds } } },
    { $group: { _id: "$customerId", totalCustomerPay: { $sum: "$paidAmount" } } },
  ]);

  const map = new Map();
  for (const x of agg) map.set(String(x._id), safeNum(x.totalCustomerPay, 0));
  return map;
};

/**
 * ✅ GET Customer Flow (table)
 * GET /api/customer/payments/customer/flow
 */
export const getCustomerFlow = async (req, res) => {
  try {
    const now = new Date();

    const customers = await Customer.find()
      .select("_id nic name tpNumber")
      .sort({ createdAt: -1 })
      .lean();

    if (!customers.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const customerIds = customers.map((c) => c._id);

    const totalPaidMap = await getCustomerTotalPaidMap(customerIds);

    const investments = await Investment.find({ customerId: { $in: customerIds } })
      .select(
        "_id customerId brokerId assetIds investmentName investmentAmount investmentInterestRate startDate interestPaidAmount principalPaidAmount remainingPendingAmount description createdAt"
      )
      .lean();

    const invByCustomer = new Map();
    for (const inv of investments) {
      const key = String(inv.customerId);
      if (!invByCustomer.has(key)) invByCustomer.set(key, []);
      invByCustomer.get(key).push(inv);
    }

    const rows = customers.map((c) => {
      const invs = invByCustomer.get(String(c._id)) || [];

      let arrearsAmount = 0;
      let arrearsMonthsCount = 0;
      let anyArrears = false;
      let anyPending = false;
      let minDate = null;
      let maxDate = null;
      let nextDue = null;

      for (const inv of invs) {
        const calc = calcInvestmentNumbers(inv, now);

        arrearsAmount += calc.arrearsInterest;
        arrearsMonthsCount += calc.arrearsMonthsCount;

        if (calc.status === "arrears") anyArrears = true;
        if (calc.status === "pending") anyPending = true;

        const dt = inv.startDate ? new Date(inv.startDate) : null;
        if (dt && !Number.isNaN(dt.getTime())) {
          if (!minDate || dt < minDate) minDate = dt;
          if (!maxDate || dt > maxDate) maxDate = dt;
        }

        // earliest upcoming due date
        if (calc.nextDueDate) {
          if (!nextDue || calc.nextDueDate < nextDue) nextDue = calc.nextDueDate;
        }
      }

      let status = "pending";
      if (invs.length === 0) status = "complete";
      else if (anyArrears) status = "arrears";
      else if (anyPending) status = "pending";
      else status = "complete";

      const totalCustomerPay = totalPaidMap.get(String(c._id)) || 0;

      return {
        customerId: c._id,
        nic: c.nic || "",
        name: c.name || "",
        tpNumber: c.tpNumber || "",
        totalCustomerPay: Number(totalCustomerPay.toFixed(2)),
        arrearsAmount: Number(arrearsAmount.toFixed(2)),
        arrearsMonthsCount,
        nextDueDate: nextDue,
        status,
        dateRange: { from: minDate, to: maxDate },
      };
    });

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      rule: {
        cycle:
          "Interest is due every calendar month from startDate (calculationStartDate). " +
          "completedCycles = count of due dates already past. " +
          "arrearsInterest = (monthlyInterest × completedCycles) − interestPaid",
        arrears: "arrearsInterest > 0 (customer missed one or more past due cycles)",
        pending: "no arrears but principal not fully paid",
        complete: "principalPending = 0 AND arrearsInterest = 0",
      },
    });
  } catch (err) {
    console.error("getCustomerFlow error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Customer Flow Detail (modal)
 * GET /api/customer/payments/customer/:nic/flow
 */
export const getCustomerFlowByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid NIC format" });
    }

    const customer = await Customer.findOne({ nic: String(nic).trim().toUpperCase() })
      .select("_id nic name tpNumber")
      .lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found for this NIC" });
    }

    const payAgg = await CustomerPayment.aggregate([
      { $match: { customerId: customer._id } },
      { $group: { _id: "$customerId", totalCustomerPay: { $sum: "$paidAmount" } } },
    ]);
    const totalCustomerPay = safeNum(payAgg?.[0]?.totalCustomerPay, 0);

    const now = new Date();

    const invs = await Investment.find({ customerId: customer._id })
      .populate("brokerId", "nic name")
      .populate(
        "assetIds",
        "assetName assetType vehicleNumber landAddress estimateAmount assetDescription isReleased"
      )
      .sort({ createdAt: -1 })
      .lean();

    let arrearsAmount = 0;
    let arrearsMonthsCount = 0;
    let anyArrears = false;
    let anyPending = false;
    let minDate = null;
    let maxDate = null;
    const arrearsInvestments = [];

    for (const inv of invs) {
      const calc = calcInvestmentNumbers(inv, now);

      arrearsAmount += calc.arrearsInterest;
      arrearsMonthsCount += calc.arrearsMonthsCount;

      if (calc.status === "arrears") anyArrears = true;
      if (calc.status === "pending") anyPending = true;

      const dt = inv.startDate ? new Date(inv.startDate) : null;
      if (dt && !Number.isNaN(dt.getTime())) {
        if (!minDate || dt < minDate) minDate = dt;
        if (!maxDate || dt > maxDate) maxDate = dt;
      }

      if (calc.arrearsInterest > 0) {
        arrearsInvestments.push({
          _id: inv._id,
          investmentName: inv.investmentName,
          investmentAmount: calc.principal,
          investmentInterestRate: calc.rate,
          monthlyInterest: calc.monthlyInterest,
          startDate: inv.startDate,
          cycles: calc.cycles,
          totalDueInterest: Number(calc.totalDueInterest.toFixed(2)),
          interestPaidAmount: calc.interestPaidAmount,
          arrearsInterest: Number(calc.arrearsInterest.toFixed(2)),
          arrearsMonthsCount: calc.arrearsMonthsCount,
          principalPending: Number(calc.principalPending.toFixed(2)),
          nextDueDate: calc.nextDueDate,
          description: inv.description || "",
          broker: inv.brokerId || null,
          assets: Array.isArray(inv.assetIds) ? inv.assetIds : [],
        });
      }
    }

    let status = "pending";
    if (invs.length === 0) status = "complete";
    else if (anyArrears) status = "arrears";
    else if (anyPending) status = "pending";
    else status = "complete";

    return res.status(200).json({
      success: true,
      data: {
        customer,
        totals: {
          totalCustomerPay: Number(totalCustomerPay.toFixed(2)),
          arrearsAmount: Number(arrearsAmount.toFixed(2)),
          arrearsMonthsCount,
          status,
        },
        dateRange: { from: minDate, to: maxDate },
        arrearsInvestments,
      },
    });
  } catch (err) {
    console.error("getCustomerFlowByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Investments for a customer+broker (for payment form)
 * GET /api/customer/payments/customer/:nic/investments?brokerId=xxx
 */
export const getCustomerInvestmentsByNic = async (req, res) => {
  try {
    const { nic } = req.params;
    const brokerId = String(req.query.brokerId || "").trim();

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid NIC format" });
    }
    if (!brokerId) {
      return res.status(400).json({ success: false, message: "brokerId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(brokerId)) {
      return res.status(400).json({ success: false, message: "Invalid brokerId" });
    }

    const customer = await Customer.findOne({ nic: String(nic).trim().toUpperCase() }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const now = new Date();

    const invs = await Investment.find({ customerId: customer._id, brokerId })
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate("assetIds", "assetName assetType vehicleNumber landAddress estimateAmount isReleased")
      .sort({ createdAt: -1 })
      .lean();

    const data = invs.map((inv) => {
      const calc = calcInvestmentNumbers(inv, now);

      return {
        _id: inv._id,
        investmentName: inv.investmentName,
        startDate: inv.startDate,

        customer: inv.customerId,
        broker: inv.brokerId,
        assets: inv.assetIds || [],

        investmentAmount: calc.principal,
        monthlyInterest: Number(calc.monthlyInterest.toFixed(2)),
        completedCycles: calc.cycles,
        totalDueInterest: Number(calc.totalDueInterest.toFixed(2)),
        interestPaidToNow: Number(calc.interestPaidAmount.toFixed(2)),

        arrearsInterest: Number(calc.arrearsInterest.toFixed(2)),
        arrearsMonthsCount: calc.arrearsMonthsCount,

        principalPaid: Number(safeNum(inv.principalPaidAmount, 0).toFixed(2)),
        principalPending: Number(calc.principalPending.toFixed(2)),

        nextDueDate: calc.nextDueDate,

        lastPaymentAmount: safeNum(inv.lastPaymentAmount, 0),
        lastPaymentDate: inv.lastPaymentDate || null,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getCustomerInvestmentsByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ CREATE Customer Payment
 * POST /api/customer/payments/pay
 *
 * Body: { customerNic, brokerId, investmentId, payAmount, paymentType, payFor, note }
 *
 * payFor: "interest" | "principal" | "interest+principal"
 *
 * Interest outstanding = (monthlyInterest × completedCycles) − interestPaid
 *   (only cycles whose due date has already passed)
 */
export const createCustomerPayment = async (req, res) => {
  try {
    const { customerNic, brokerId, investmentId, payAmount, paymentType, payFor, note } =
      req.body || {};

    if (!customerNic || !brokerId || !investmentId || payAmount === undefined || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "customerNic, brokerId, investmentId, payAmount, paymentType are required",
      });
    }

    if (!isValidSriLankaNIC(customerNic)) {
      return res.status(400).json({ success: false, message: "Invalid customerNic format" });
    }
    if (!mongoose.Types.ObjectId.isValid(brokerId)) {
      return res.status(400).json({ success: false, message: "Invalid brokerId" });
    }
    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
      return res.status(400).json({ success: false, message: "Invalid investmentId" });
    }

    const method = String(paymentType).toLowerCase();
    if (!["cash", "check"].includes(method)) {
      return res.status(400).json({ success: false, message: "paymentType must be cash or check" });
    }

    const payForMode = String(payFor || "interest").toLowerCase();
    if (!["interest", "principal", "interest+principal"].includes(payForMode)) {
      return res.status(400).json({
        success: false,
        message: "payFor must be interest, principal, or interest+principal",
      });
    }

    const amountPaid = Number(payAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "payAmount must be > 0" });
    }

    const customer = await Customer.findOne({ nic: String(customerNic).trim().toUpperCase() });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const broker = await Broker.findById(brokerId).lean();
    if (!broker) return res.status(404).json({ success: false, message: "Broker not found" });

    const inv = await Investment.findById(investmentId);
    if (!inv) return res.status(404).json({ success: false, message: "Investment not found" });

    if (String(inv.customerId) !== String(customer._id)) {
      return res.status(400).json({ success: false, message: "Investment does not belong to this customer" });
    }
    if (String(inv.brokerId) !== String(brokerId)) {
      return res.status(400).json({ success: false, message: "Investment does not belong to selected broker" });
    }

    const assetIds = Array.isArray(inv.assetIds) ? inv.assetIds : [];
    if (assetIds.length === 0) {
      return res.status(400).json({ success: false, message: "This investment has no assetIds." });
    }

    const now = new Date();

    // ✅ Calculate using 30-day cycle rule
    const principal = safeNum(inv.investmentAmount, 0);
    const rate = safeNum(inv.investmentInterestRate, 0);
    const monthInt = monthlyInterest(principal, rate);
    const cycles = completedCycles(inv.startDate, now);

    // Total interest owed from all past due cycles
    const totalDueInterest = monthInt * cycles;
    const interestPaidBefore = safeNum(inv.interestPaidAmount, 0);

    // Arrears-only interest (past due cycles not yet paid)
    const arrearsInterestBeforePayment = Math.max(totalDueInterest - interestPaidBefore, 0);

    // Outstanding interest the customer can pay now:
    // = arrears from past cycles + current month's interest (next upcoming cycle)
    // We allow paying up to: arrearsInterest + 1 month forward
    const interestOutstanding = Math.max(totalDueInterest + monthInt - interestPaidBefore, 0);

    const principalPaidBefore = safeNum(inv.principalPaidAmount, 0);
    const principalPendingBefore =
      inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
        ? Math.max(principal - principalPaidBefore, 0)
        : Math.max(safeNum(inv.remainingPendingAmount, 0), 0);

    let remaining = amountPaid;
    let interestPart = 0;
    let principalPart = 0;

    if (payForMode === "interest") {
      interestPart = Math.min(interestOutstanding, remaining);
      remaining -= interestPart;
    } else if (payForMode === "principal") {
      principalPart = Math.min(principalPendingBefore, remaining);
      remaining -= principalPart;
    } else {
      // interest+principal: clear interest first, then principal
      interestPart = Math.min(interestOutstanding, remaining);
      remaining -= interestPart;

      principalPart = Math.min(principalPendingBefore, remaining);
      remaining -= principalPart;
    }

    const excessAmount = Math.max(remaining, 0);

    const totalInterestPaidAfter = interestPaidBefore + interestPart;
    const totalPrincipalPaidAfter = principalPaidBefore + principalPart;

    const principalPendingAfter = Math.max(principalPendingBefore - principalPart, 0);
    const isPrincipalFullyPaidAfter = principalPendingAfter <= 0;

    const payment = await CustomerPayment.create({
      customerId: customer._id,
      brokerId: inv.brokerId,
      investmentId: inv._id,
      assetIds,

      paymentType: method,
      payFor: payForMode,
      paidAmount: amountPaid,

      interestPart,
      principalPart,
      excessAmount,

      totalInterestPaidAfter,
      totalPrincipalPaidAfter,
      isPrincipalFullyPaidAfter,

      note: note ? String(note).trim() : "",
      paidAt: now,
    });

    inv.interestPaidAmount = totalInterestPaidAfter;
    inv.principalPaidAmount = totalPrincipalPaidAfter;
    inv.totalPaidAmount = safeNum(inv.totalPaidAmount, 0) + amountPaid;
    inv.remainingPendingAmount = principalPendingAfter;
    inv.lastPaymentAmount = amountPaid;
    inv.lastPaymentDate = payment.paidAt;

    await inv.save();

    // Check if fully settled (no arrears, no principal pending)
    const arrearsAfter = Math.max(totalDueInterest - inv.interestPaidAmount, 0);
    const isSettled = principalPendingAfter <= 0 && arrearsAfter <= 0;

    if (isSettled) {
      await Asset.updateMany(
        { _id: { $in: assetIds } },
        { $set: { isReleased: true, releasedAt: now, releaseNote: "Released after full settlement" } }
      );
    }

    // Next due date after payment
    const nextDue = nextDueDate(inv.startDate, now);

    return res.status(201).json({
      success: true,
      message: excessAmount > 0 ? "Payment saved (excess recorded)" : "Payment saved",
      data: {
        payment,
        summary: {
          investmentId: inv._id,
          calculationStartDate: inv.startDate,
          monthlyInterest: Number(monthInt.toFixed(2)),
          completedCycles: cycles,
          totalDueInterest: Number(totalDueInterest.toFixed(2)),
          arrearsInterestBeforePayment: Number(arrearsInterestBeforePayment.toFixed(2)),
          arrearsInterestAfterPayment: Number(arrearsAfter.toFixed(2)),
          interestPaidAmount: inv.interestPaidAmount,
          principalPaidAmount: inv.principalPaidAmount,
          principalPendingAmount: inv.remainingPendingAmount,
          isPrincipalFullyPaid: isPrincipalFullyPaidAfter,
          isSettled,
          assetReleased: isSettled,
          excessAmount,
          nextDueDate: nextDue,
        },
      },
    });
  } catch (err) {
    console.error("createCustomerPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};