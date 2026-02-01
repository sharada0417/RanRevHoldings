import mongoose from "mongoose";
import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Asset from "../infastructure/schemas/asset.js";
import Investment from "../infastructure/schemas/investement.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

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

const safeNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const monthlyInterest = (principal, ratePercent) => {
  const p = safeNum(principal, 0);
  const r = safeNum(ratePercent, 0);
  return Math.max((p * r) / 100, 0);
};

/**
 * ✅ Full months elapsed between startDate and now.
 * - startDate 2026-01-02
 * - now 2026-02-01 => 0 months (NOT arrears yet)
 * - now 2026-02-02 => 1 month (arrears begins)
 */
const fullMonthsElapsed = (startDate, now = new Date()) => {
  if (!startDate) return 0;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return 0;

  let months =
    (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());

  if (now.getDate() < s.getDate()) months -= 1;

  return Math.max(months, 0);
};

const calcInvestmentNumbers = (inv, now) => {
  const principal = safeNum(inv.investmentAmount, 0);
  const rate = safeNum(inv.investmentInterestRate, 0);

  const monthInt = monthlyInterest(principal, rate);
  const dueMonths = fullMonthsElapsed(inv.startDate, now);

  // arrears interest is only past FULL months:
  const pastDueInterest = monthInt * dueMonths;

  const interestPaid = safeNum(inv.interestPaidAmount, 0);
  const arrearsInterest = Math.max(pastDueInterest - interestPaid, 0);

  // principal pending (keep your logic)
  const principalPaid = safeNum(inv.principalPaidAmount, 0);
  const principalPending =
    inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
      ? Math.max(principal - principalPaid, 0)
      : Math.max(safeNum(inv.remainingPendingAmount, 0), 0);

  // arrears months count (only if arrears exists)
  const arrearsMonthsCount =
    arrearsInterest > 0 && monthInt > 0 ? Math.ceil(arrearsInterest / monthInt) : 0;

  // status per investment
  let status = "pending";
  if (principalPending <= 0 && arrearsInterest <= 0) status = "complete";
  else if (arrearsInterest > 0) status = "arrears";
  else status = "pending";

  return {
    principal,
    rate,
    monthlyInterest: monthInt,
    dueMonths,
    pastDueInterest,
    interestPaidAmount: interestPaid,
    arrearsInterest,
    principalPending,
    arrearsMonthsCount,
    status,
  };
};

/**
 * ✅ helper: sum customer paid money (CustomerPayment.paidAmount)
 */
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
 *
 * TABLE REQUIRED:
 *  nic, name, tpNumber,
 *  totalCustomerPay (customer paid money until now),
 *  arrearsAmount, arrearsMonthsCount,
 *  status
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

    // ✅ sum total customer paid (until now)
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

        // ✅ customer paid money until now
        totalCustomerPay: Number(totalCustomerPay.toFixed(2)),

        arrearsAmount: Number(arrearsAmount.toFixed(2)),
        arrearsMonthsCount: Number(arrearsMonthsCount),
        status,
        dateRange: { from: minDate, to: maxDate },
      };
    });

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      meaning: {
        totalCustomerPay: "Sum of CustomerPayment.paidAmount for this customer (paid until now)",
      },
      rule: {
        arrears: "arrearsInterest > 0 (only after full months elapsed)",
        pending: "no arrears but principalPending > 0",
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
 *
 * DETAILS:
 *  - totals.totalCustomerPay (paid until now)
 *  - totals.arrearsAmount, totals.arrearsMonthsCount, totals.status
 *  - arrearsInvestments (only investments where arrearsInterest > 0)
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

    // ✅ total customer paid until now
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
          dueMonths: calc.dueMonths,

          interestPaidAmount: calc.interestPaidAmount,
          arrearsInterest: calc.arrearsInterest,
          principalPending: calc.principalPending,

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
          // ✅ customer paid until now
          totalCustomerPay: Number(totalCustomerPay.toFixed(2)),

          arrearsAmount: Number(arrearsAmount.toFixed(2)),
          arrearsMonthsCount: Number(arrearsMonthsCount),
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

/* ===========================
   ✅ EXISTING: getCustomerInvestmentsByNic + createCustomerPayment
   (KEEP your existing logic below — unchanged)
   =========================== */

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
      const principal = safeNum(inv.investmentAmount, 0);
      const rate = safeNum(inv.investmentInterestRate, 0);

      const monthInt = monthlyInterest(principal, rate);
      const months = fullMonthsElapsed(inv.startDate, now);

      const pastDue = monthInt * months;

      const interestPaid = safeNum(inv.interestPaidAmount, 0);
      const arrearsInterest = Math.max(pastDue - interestPaid, 0);

      const principalPaid = safeNum(inv.principalPaidAmount, 0);
      const principalPending =
        inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
          ? Math.max(principal - principalPaid, 0)
          : Math.max(safeNum(inv.remainingPendingAmount, 0), 0);

      return {
        _id: inv._id,
        investmentName: inv.investmentName,
        startDate: inv.startDate,

        customer: inv.customerId,
        broker: inv.brokerId,
        assets: inv.assetIds || [],

        investmentAmount: principal,
        thisMonthInterest: monthInt,
        dueMonths: months,
        totalInterestPastDue: pastDue,
        interestPaidToNow: interestPaid,

        arrearsInterest,
        principalPaid,
        principalPending,

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
      return res
        .status(400)
        .json({ success: false, message: "Investment does not belong to this customer" });
    }
    if (String(inv.brokerId) !== String(brokerId)) {
      return res.status(400).json({
        success: false,
        message: "This investment does not belong to selected broker",
      });
    }

    const assetIds = Array.isArray(inv.assetIds) ? inv.assetIds : [];
    if (assetIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This investment has no assetIds. Fix investment data.",
      });
    }

    const now = new Date();

    const principal = safeNum(inv.investmentAmount, 0);
    const rate = safeNum(inv.investmentInterestRate, 0);

    const monthInt = monthlyInterest(principal, rate);
    const dueMonths = fullMonthsElapsed(inv.startDate, now);
    const pastDueInterest = monthInt * dueMonths;

    const interestPaidBefore = safeNum(inv.interestPaidAmount, 0);

    const interestOutstandingForPayment = Math.max(
      pastDueInterest + monthInt - interestPaidBefore,
      0
    );

    const principalPaidBefore = safeNum(inv.principalPaidAmount, 0);
    const principalPendingBefore =
      inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
        ? Math.max(principal - principalPaidBefore, 0)
        : Math.max(safeNum(inv.remainingPendingAmount, 0), 0);

    let remaining = amountPaid;
    let interestPart = 0;
    let principalPart = 0;

    if (payForMode === "interest") {
      interestPart = Math.min(interestOutstandingForPayment, remaining);
      remaining -= interestPart;
    } else if (payForMode === "principal") {
      principalPart = Math.min(principalPendingBefore, remaining);
      remaining -= principalPart;
    } else {
      interestPart = Math.min(interestOutstandingForPayment, remaining);
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

    const arrearsAfter = Math.max(pastDueInterest - inv.interestPaidAmount, 0);
    const isSettled = principalPendingAfter <= 0 && arrearsAfter <= 0;

    if (isSettled) {
      await Asset.updateMany(
        { _id: { $in: assetIds } },
        { $set: { isReleased: true, releasedAt: now, releaseNote: "Released after full settlement" } }
      );
    }

    return res.status(201).json({
      success: true,
      message: excessAmount > 0 ? "Payment saved (excess recorded)" : "Payment saved",
      data: {
        payment,
        summary: {
          investmentId: inv._id,
          thisMonthInterest: monthInt,
          dueMonths,
          totalInterestPastDue: pastDueInterest,
          arrearsInterest: arrearsAfter,
          interestPaidAmount: inv.interestPaidAmount,
          principalPaidAmount: inv.principalPaidAmount,
          principalPendingAmount: inv.remainingPendingAmount,
          isPrincipalFullyPaid: isPrincipalFullyPaidAfter,
          isSettled,
          assetReleased: isSettled,
          excessAmount,
        },
      },
    });
  } catch (err) {
    console.error("createCustomerPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
