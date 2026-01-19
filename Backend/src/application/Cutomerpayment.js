import mongoose from "mongoose";
import Customer from "../infastructure/schemas/customer.js";
import Asset from "../infastructure/schemas/asset.js";
import Investment from "../infastructure/schemas/investement.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

// NIC validation (same rules)
const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

// ✅ Calculations (percent-based)
const calcInterestAmount = (investmentAmount, ratePercent) =>
  Number(investmentAmount) * (Number(ratePercent) / 100);

const calcTotalPayable = (investmentAmount, ratePercent) =>
  Number(investmentAmount) + calcInterestAmount(investmentAmount, ratePercent);

// ✅ Duration-based monthly
const calcMonthlyInterest = (interestAmount, durationMonths) =>
  Number(durationMonths) > 0 ? Number(interestAmount) / Number(durationMonths) : 0;

const calcMonthlyTotal = (totalPayable, durationMonths) =>
  Number(durationMonths) > 0 ? Number(totalPayable) / Number(durationMonths) : 0;

/**
 * ✅ POST Pay (store history + update remaining)
 * POST /api/customer/payments/pay
 * body: { customerNic, investmentId, payAmount, paymentType, note }
 */
export const createCustomerPayment = async (req, res) => {
  try {
    const { customerNic, investmentId, payAmount, paymentType, note } = req.body || {};

    if (!customerNic || !investmentId || payAmount === undefined || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "customerNic, investmentId, payAmount, paymentType are required",
      });
    }

    // ✅ paymentType validation
    if (!["cash", "check"].includes(String(paymentType).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "paymentType must be cash or check",
      });
    }

    if (!isValidSriLankaNIC(customerNic)) {
      return res.status(400).json({ success: false, message: "Invalid customerNic format" });
    }

    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
      return res.status(400).json({ success: false, message: "Invalid investmentId" });
    }

    const amountPaid = Number(payAmount);
    if (Number.isNaN(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "payAmount must be > 0" });
    }

    const normalizedNic = String(customerNic).trim().toUpperCase();
    const customer = await Customer.findOne({ nic: normalizedNic });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });

    if (String(investment.customerId) !== String(customer._id)) {
      return res.status(400).json({
        success: false,
        message: "Investment does not belong to this customer",
      });
    }

    const totalPayable = calcTotalPayable(
      investment.investmentAmount,
      investment.investmentInterestRate
    );

    const interestAmount = calcInterestAmount(
      investment.investmentAmount,
      investment.investmentInterestRate
    );

    const totalPaidBefore = Number(investment.totalPaidAmount || 0);

    const pendingBefore =
      investment.remainingPendingAmount === null || investment.remainingPendingAmount === undefined
        ? Math.max(totalPayable - totalPaidBefore, 0)
        : Number(investment.remainingPendingAmount);

    if (pendingBefore <= 0) {
      return res.status(400).json({ success: false, message: "This investment is already fully paid" });
    }

    if (amountPaid > pendingBefore) {
      return res.status(400).json({
        success: false,
        message: `payAmount cannot be greater than pending amount (${pendingBefore})`,
      });
    }

    const totalPaidAfter = totalPaidBefore + amountPaid;
    const pendingAfter = Math.max(pendingBefore - amountPaid, 0);

    // ✅ create payment record (history)
    const payment = await CustomerPayment.create({
      customerId: customer._id,
      investmentId: investment._id,
      assetId: investment.assetId,

      paymentType: String(paymentType).toLowerCase(), // ✅

      paidAmount: amountPaid,

      investmentAmount: investment.investmentAmount,
      interestRate: investment.investmentInterestRate,
      interestAmount,
      totalPayable,

      totalPaidBefore,
      totalPaidAfter,

      pendingBefore,
      pendingAfter,

      note: note ? String(note).trim() : "",
      paidAt: new Date(),
    });

    // ✅ update investment summary fields
    investment.totalPaidAmount = totalPaidAfter;
    investment.remainingPendingAmount = pendingAfter;
    investment.lastPaymentAmount = amountPaid;
    investment.lastPaymentDate = payment.paidAt;
    await investment.save();

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        investmentSummary: {
          investmentId: investment._id,
          totalPayable,
          totalPaidAmount: investment.totalPaidAmount,
          totalPendingPayment: investment.remainingPendingAmount,
          lastPaymentAmount: investment.lastPaymentAmount,
          lastPaymentDate: investment.lastPaymentDate,
        },
      },
    });
  } catch (err) {
    console.error("createCustomerPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Full Investment Payment Report (summary + history)
 * GET /api/customer/payments/investment/:investmentId/full
 */
export const getInvestmentFullPaymentReport = async (req, res) => {
  try {
    const { investmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
      return res.status(400).json({ success: false, message: "Invalid investmentId" });
    }

    const investment = await Investment.findById(investmentId)
      .populate("customerId", "nic name tpNumber city address")
      .populate("assetId", "assetName assetType vehicleNumber landAddress estimateAmount")
      .lean();

    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });

    const interestAmount = calcInterestAmount(
      investment.investmentAmount,
      investment.investmentInterestRate
    );
    const totalPayable = calcTotalPayable(
      investment.investmentAmount,
      investment.investmentInterestRate
    );

    const monthlyInterestAmount = calcMonthlyInterest(
      interestAmount,
      investment.investmentDurationMonths
    );
    const monthlyTotalWithInvestment = calcMonthlyTotal(
      totalPayable,
      investment.investmentDurationMonths
    );

    const totalPaidAmount = Number(investment.totalPaidAmount || 0);

    const totalPendingPayment =
      investment.remainingPendingAmount === null || investment.remainingPendingAmount === undefined
        ? Math.max(totalPayable - totalPaidAmount, 0)
        : Number(investment.remainingPendingAmount);

    const history = await CustomerPayment.find({ investmentId })
      .sort({ paidAt: -1 })
      .lean();

    const lastPaymentAmount = investment.lastPaymentAmount || (history[0]?.paidAmount ?? 0);
    const lastPaymentDate = investment.lastPaymentDate || (history[0]?.paidAt ?? null);

    return res.status(200).json({
      success: true,
      data: {
        investmentId: investment._id,
        assetId: investment.assetId?._id || investment.assetId,
        customerId: investment.customerId?._id || investment.customerId,

        investmentDate: investment.createdAt,

        investamount: investment.investmentAmount,
        interetrate: investment.investmentInterestRate,

        interestamount: interestAmount,
        totalinvestmentwithintrestamount: totalPayable,

        monthyintesetamount: monthlyInterestAmount,
        monthlyintesetwithinvset: monthlyTotalWithInvestment,

        lastpyamtnt: lastPaymentAmount,
        lastpamentdate: lastPaymentDate,

        totalpayamount: totalPaidAmount,
        totalpendingpayment: totalPendingPayment,

        customer: investment.customerId,
        asset: investment.assetId,

        paymentHistory: history.map((p) => ({
          paymentId: p._id,
          paidAmount: p.paidAmount,
          paymentType: p.paymentType, // ✅ include
          paidAt: p.paidAt,
          note: p.note || "",
          pendingBefore: p.pendingBefore,
          pendingAfter: p.pendingAfter,
          totalPaidAfter: p.totalPaidAfter,
        })),
      },
    });
  } catch (err) {
    console.error("getInvestmentFullPaymentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Full report by Customer NIC + AssetId
 * GET /api/customer/payments/customer/:nic/asset/:assetId/full
 */
export const getCustomerAssetFullPaymentReport = async (req, res) => {
  try {
    const { nic, assetId } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid NIC format" });
    }
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ success: false, message: "Invalid assetId" });
    }

    const normalizedNic = String(nic).trim().toUpperCase();
    const customer = await Customer.findOne({ nic: normalizedNic }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const asset = await Asset.findById(assetId).lean();
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    if (asset.customerId && String(asset.customerId) !== String(customer._id)) {
      return res.status(400).json({ success: false, message: "This asset does not belong to this customer" });
    }

    const investments = await Investment.find({ customerId: customer._id, assetId: asset._id })
      .sort({ createdAt: -1 })
      .lean();

    const data = [];
    for (const inv of investments) {
      const interestAmount = calcInterestAmount(inv.investmentAmount, inv.investmentInterestRate);
      const totalPayable = calcTotalPayable(inv.investmentAmount, inv.investmentInterestRate);
      const monthlyInterestAmount = calcMonthlyInterest(interestAmount, inv.investmentDurationMonths);
      const monthlyTotalWithInvestment = calcMonthlyTotal(totalPayable, inv.investmentDurationMonths);

      const totalPaidAmount = Number(inv.totalPaidAmount || 0);
      const totalPendingPayment =
        inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
          ? Math.max(totalPayable - totalPaidAmount, 0)
          : Number(inv.remainingPendingAmount);

      const history = await CustomerPayment.find({ investmentId: inv._id }).sort({ paidAt: -1 }).lean();

      data.push({
        investmentId: inv._id,
        investmentDate: inv.createdAt,
        investamount: inv.investmentAmount,
        interetrate: inv.investmentInterestRate,
        interestamount: interestAmount,
        totalinvestmentwithintrestamount: totalPayable,
        monthyintesetamount: monthlyInterestAmount,
        monthlyintesetwithinvset: monthlyTotalWithInvestment,
        lastpyamtnt: inv.lastPaymentAmount || (history[0]?.paidAmount ?? 0),
        lastpamentdate: inv.lastPaymentDate || (history[0]?.paidAt ?? null),
        totalpayamount: totalPaidAmount,
        totalpendingpayment: totalPendingPayment,
        paymentHistory: history.map((p) => ({
          ...p,
          paymentType: p.paymentType || "cash",
        })),
      });
    }

    return res.status(200).json({
      success: true,
      customer,
      asset,
      data,
    });
  } catch (err) {
    console.error("getCustomerAssetFullPaymentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =======================================================================
   ✅ ADDED BELOW (NO CHANGES ABOVE)
   ======================================================================= */

/**
 * ✅ CUSTOMER FLOW LIST (ALL CUSTOMERS)
 * GET /api/customer/payments/customer/flow
 */
export const getCustomerFlowList = async (req, res) => {
  try {
    const arrearsDays = Number(req.query?.arrearsDays || 30);
    const thresholdMs = arrearsDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const customers = await Customer.find().sort({ createdAt: -1 }).lean();
    const customerIds = customers.map((c) => c._id);

    const investments = await Investment.find({ customerId: { $in: customerIds } })
      .select(
        "customerId investmentAmount investmentInterestRate totalPaidAmount remainingPendingAmount lastPaymentDate"
      )
      .lean();

    const byCustomer = new Map();
    for (const inv of investments) {
      const k = String(inv.customerId);
      if (!byCustomer.has(k)) byCustomer.set(k, []);
      byCustomer.get(k).push(inv);
    }

    const rows = customers.map((c) => {
      const invs = byCustomer.get(String(c._id)) || [];

      let totalInvestment = 0;
      let fullPayMoney = 0;
      let pendingMoney = 0;
      let arrearsMoney = 0;

      for (const inv of invs) {
        const investAmount = Number(inv.investmentAmount || 0);
        const totalPayable = calcTotalPayable(investAmount, Number(inv.investmentInterestRate || 0));

        const totalPaid = Number(inv.totalPaidAmount || 0);

        const pending =
          inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
            ? Math.max(totalPayable - totalPaid, 0)
            : Number(inv.remainingPendingAmount || 0);

        totalInvestment += investAmount;
        fullPayMoney += totalPayable;
        pendingMoney += pending;

        const last = inv.lastPaymentDate ? new Date(inv.lastPaymentDate).getTime() : null;
        const isArrears = pending > 0 && (!last || now - last > thresholdMs);

        if (isArrears) arrearsMoney += pending;
      }

      const status = arrearsMoney > 0 ? "arrears" : pendingMoney > 0 ? "pending" : "finished";

      return {
        _id: c._id,
        nic: c.nic,
        name: c.name,
        totalInvestment: Number(totalInvestment.toFixed(2)),
        fullPayMoney: Number(fullPayMoney.toFixed(2)),
        pendingMoney: Number(pendingMoney.toFixed(2)),
        arrearsMoney: Number(arrearsMoney.toFixed(2)),
        status,
      };
    });

    return res.status(200).json({ success: true, arrearsDays, data: rows });
  } catch (err) {
    console.error("getCustomerFlowList error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ CUSTOMER FLOW DETAILS (BY NIC)
 * GET /api/customer/payments/customer/:nic/flow
 */
export const getCustomerFlowByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid NIC format" });
    }

    const arrearsDays = Number(req.query?.arrearsDays || 30);
    const thresholdMs = arrearsDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const normalizedNic = String(nic).trim().toUpperCase();
    const customer = await Customer.findOne({ nic: normalizedNic }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const investments = await Investment.find({ customerId: customer._id })
      .select(
        "investmentAmount investmentInterestRate totalPaidAmount remainingPendingAmount lastPaymentDate"
      )
      .sort({ createdAt: -1 })
      .lean();

    let totalInvestment = 0;
    let fullPayMoney = 0;
    let pendingMoney = 0;
    let arrearsMoney = 0;

    for (const inv of investments) {
      const investAmount = Number(inv.investmentAmount || 0);
      const totalPayable = calcTotalPayable(investAmount, Number(inv.investmentInterestRate || 0));

      const totalPaid = Number(inv.totalPaidAmount || 0);

      const pending =
        inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
          ? Math.max(totalPayable - totalPaid, 0)
          : Number(inv.remainingPendingAmount || 0);

      totalInvestment += investAmount;
      fullPayMoney += totalPayable;
      pendingMoney += pending;

      const last = inv.lastPaymentDate ? new Date(inv.lastPaymentDate).getTime() : null;
      const isArrears = pending > 0 && (!last || now - last > thresholdMs);

      if (isArrears) arrearsMoney += pending;
    }

    const payments = await CustomerPayment.find({ customerId: customer._id })
      .select("paidAmount paidAt")
      .sort({ paidAt: 1 })
      .lean();

    const totalCustomerPayMoney = payments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);

    const fromDate = payments.length ? payments[0].paidAt : null;
    const toDate = payments.length ? payments[payments.length - 1].paidAt : null;

    const status = arrearsMoney > 0 ? "arrears" : pendingMoney > 0 ? "pending" : "finished";

    return res.status(200).json({
      success: true,
      arrearsDays,
      data: {
        customer: { _id: customer._id, nic: customer.nic, name: customer.name },
        totals: {
          totalInvestment: Number(totalInvestment.toFixed(2)),
          fullPayMoney: Number(fullPayMoney.toFixed(2)),
          pendingMoney: Number(pendingMoney.toFixed(2)),
          arrearsMoney: Number(arrearsMoney.toFixed(2)),
          totalCustomerPayMoney: Number(totalCustomerPayMoney.toFixed(2)),
          status,
        },
        dateRange: {
          from: fromDate,
          to: toDate,
        },
      },
    });
  } catch (err) {
    console.error("getCustomerFlowByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
