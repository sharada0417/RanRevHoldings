// application/brokerpayment.js
import mongoose from "mongoose";
import Broker from "../infastructure/schemas/broker.js";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";
import BrokerPayment from "../infastructure/schemas/brokerpayment.js";

// NIC validation
const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

const n = (x) => Number(x || 0);
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

// ✅ interest amount
const calcInterestAmount = (investmentAmount, interestRatePercent) =>
  n(investmentAmount) * (n(interestRatePercent) / 100);

// ✅ customer total payable
const calcCustomerTotalPayable = (investmentAmount, interestRatePercent) =>
  n(investmentAmount) + calcInterestAmount(investmentAmount, interestRatePercent);

// ✅ customer monthly
const calcCustomerMonthly = (customerTotalPayable, durationMonths) =>
  n(durationMonths) > 0 ? n(customerTotalPayable) / n(durationMonths) : 0;

// ✅ broker commission total (based on interest)
const calcBrokerCommissionTotal = (interestAmount, brokerCommissionRatePercent) =>
  n(interestAmount) * (n(brokerCommissionRatePercent) / 100);

// ✅ broker monthly commission
const calcBrokerMonthly = (brokerCommissionTotal, durationMonths) =>
  n(durationMonths) > 0 ? n(brokerCommissionTotal) / n(durationMonths) : 0;

/**
 * ✅ Main calculation:
 * monthsPaid = floor(customerTotalPaid / customerMonthly)
 * unlockedBroker = monthsPaid * brokerMonthly (cap to brokerCommissionTotal)
 * nowPayable = unlockedBroker - brokerAlreadyPaid
 */
const calcMonthlyUnlockNowPayable = ({
  investmentAmount,
  interestRate,
  brokerCommissionRate,
  durationMonths,
  customerTotalPaidAmount,
  brokerTotalPaidAmount,
}) => {
  const investAmt = n(investmentAmount);
  const intRate = n(interestRate);
  const commRate = n(brokerCommissionRate);
  const months = Math.max(n(durationMonths), 0);

  const interestAmount = calcInterestAmount(investAmt, intRate);
  const customerTotalPayable = investAmt + interestAmount;
  const customerMonthly = calcCustomerMonthly(customerTotalPayable, months);

  const brokerCommissionTotal = calcBrokerCommissionTotal(interestAmount, commRate);
  const brokerMonthly = calcBrokerMonthly(brokerCommissionTotal, months);

  const customerPaid = Math.max(n(customerTotalPaidAmount), 0);
  const brokerPaid = Math.max(n(brokerTotalPaidAmount), 0);

  // ✅ if duration invalid, lock everything
  if (months <= 0 || customerMonthly <= 0 || brokerMonthly <= 0) {
    return {
      interestAmount,
      customerTotalPayable,
      customerMonthly,
      brokerCommissionTotal,
      brokerMonthly,
      monthsPaid: 0,
      unlockedBrokerPayable: 0,
      nowPayable: 0,
      brokerRemainingTotal: Math.max(brokerCommissionTotal - brokerPaid, 0),
    };
  }

  const monthsPaid = clamp(Math.floor(customerPaid / customerMonthly), 0, months);

  const unlockedBrokerPayable = Math.min(monthsPaid * brokerMonthly, brokerCommissionTotal);

  const nowPayable = Math.max(unlockedBrokerPayable - brokerPaid, 0);

  const brokerRemainingTotal = Math.max(brokerCommissionTotal - brokerPaid, 0);

  return {
    interestAmount,
    customerTotalPayable,
    customerMonthly,
    brokerCommissionTotal,
    brokerMonthly,
    monthsPaid,
    unlockedBrokerPayable,
    nowPayable,
    brokerRemainingTotal,
  };
};

/**
 * ✅ GET Broker summary by NIC
 * GET /api/broker/payments/broker/:nic/summary
 *
 * IMPORTANT for your frontend:
 * - inv.nowPayable must exist
 * - inv.brokerPendingAmount can be full remaining OR now (your UI shows both)
 * - payableUnlocked = nowPayable > 0
 *
 * For best UI:
 * - brokerPendingAmount = brokerRemainingTotal (full remaining)
 * - nowPayable = payable now (unlocked - paid)
 */
export const getBrokerPaymentSummaryByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid broker NIC format" });
    }

    const normalizedNic = String(nic).trim().toUpperCase();
    const broker = await Broker.findOne({ nic: normalizedNic }).lean();
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found for this NIC" });
    }

    const investments = await Investment.find({ brokerId: broker._id })
      .populate("customerId", "nic name")
      .populate("assetId", "assetName assetType vehicleNumber landAddress estimateAmount")
      .sort({ createdAt: -1 })
      .lean();

    let totalBrokerPayable = 0;   // full commission total
    let totalBrokerPaid = 0;
    let totalNowPayable = 0;      // payable now
    let totalBrokerRemaining = 0; // full remaining

    const rows = investments.map((inv) => {
      const calc = calcMonthlyUnlockNowPayable({
        investmentAmount: inv.investmentAmount,
        interestRate: inv.investmentInterestRate,
        brokerCommissionRate: inv.brokerCommissionRate,
        durationMonths: inv.investmentDurationMonths,
        customerTotalPaidAmount: inv.totalPaidAmount,          // ✅ must be maintained by customer payments
        brokerTotalPaidAmount: inv.brokerTotalPaidAmount,
      });

      const brokerPaid = n(inv.brokerTotalPaidAmount);

      totalBrokerPayable += calc.brokerCommissionTotal;
      totalBrokerPaid += brokerPaid;
      totalNowPayable += calc.nowPayable;
      totalBrokerRemaining += calc.brokerRemainingTotal;

      return {
        investmentId: inv._id,
        investmentDate: inv.createdAt,

        asset: inv.assetId || null,
        customer: inv.customerId || null,

        investmentAmount: n(inv.investmentAmount),
        investmentInterestRate: n(inv.investmentInterestRate),
        investmentDurationMonths: n(inv.investmentDurationMonths),

        // customer side
        interestAmount: calc.interestAmount,
        customerTotalPayable: calc.customerTotalPayable,
        customerMonthlyInstallment: calc.customerMonthly,
        customerTotalPaidAmount: n(inv.totalPaidAmount),

        // broker side
        brokerCommissionRate: n(inv.brokerCommissionRate),
        brokerCommissionTotal: calc.brokerCommissionTotal,
        brokerMonthlyInstallment: calc.brokerMonthly,

        monthsPaid: calc.monthsPaid,
        unlockedBrokerPayable: calc.unlockedBrokerPayable,

        nowPayable: calc.nowPayable,                    // ✅ payable now
        payableUnlocked: calc.nowPayable > 0,

        brokerTotalPaidAmount: brokerPaid,
        brokerPendingAmount: calc.brokerRemainingTotal, // ✅ FULL remaining (nice for UI)
        brokerRemainingTotal: calc.brokerRemainingTotal,

        brokerLastPaymentAmount: n(inv.brokerLastPaymentAmount),
        brokerLastPaymentDate: inv.brokerLastPaymentDate || null,
      };
    });

    return res.status(200).json({
      success: true,
      broker: {
        _id: broker._id,
        nic: broker.nic,
        name: broker.name,
        tpNumber: broker.tpNumber || "",
      },
      totals: {
        totalBrokerPayable: Number(totalBrokerPayable.toFixed(2)),
        totalBrokerPaid: Number(totalBrokerPaid.toFixed(2)),
        totalBrokerPending: Number(totalBrokerRemaining.toFixed(2)), // FULL remaining
        totalNowPayable: Number(totalNowPayable.toFixed(2)),         // payable now
      },
      investments: rows,
      rule: {
        customerMonthly: "(investmentAmount + interest) / durationMonths",
        brokerMonthly: "(interest * brokerCommissionRate/100) / durationMonths",
        monthsPaid: "floor(customerTotalPaid / customerMonthly)",
        unlockedBroker: "monthsPaid * brokerMonthly (cap to broker total)",
        nowPayable: "unlockedBroker - brokerAlreadyPaid",
      },
    });
  } catch (err) {
    console.error("getBrokerPaymentSummaryByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ POST create broker payment
 * POST /api/broker/payments/pay
 * body: { brokerNic, investmentId, payAmount, note }
 *
 * Only allow paying up to nowPayable
 */
export const createBrokerPayment = async (req, res) => {
  try {
    const { brokerNic, investmentId, payAmount, note } = req.body || {};

    if (!brokerNic || !investmentId || payAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "brokerNic, investmentId, payAmount are required",
      });
    }

    if (!isValidSriLankaNIC(brokerNic)) {
      return res.status(400).json({ success: false, message: "Invalid brokerNic format" });
    }

    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
      return res.status(400).json({ success: false, message: "Invalid investmentId" });
    }

    const amountPaid = Number(payAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "payAmount must be > 0" });
    }

    const normalizedNic = String(brokerNic).trim().toUpperCase();
    const broker = await Broker.findOne({ nic: normalizedNic });
    if (!broker) return res.status(404).json({ success: false, message: "Broker not found" });

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });

    if (String(investment.brokerId) !== String(broker._id)) {
      return res.status(400).json({
        success: false,
        message: "This investment does not belong to this broker",
      });
    }

    const calc = calcMonthlyUnlockNowPayable({
      investmentAmount: investment.investmentAmount,
      interestRate: investment.investmentInterestRate,
      brokerCommissionRate: investment.brokerCommissionRate,
      durationMonths: investment.investmentDurationMonths,
      customerTotalPaidAmount: investment.totalPaidAmount,
      brokerTotalPaidAmount: investment.brokerTotalPaidAmount,
    });

    const nowPayable = n(calc.nowPayable);

    if (nowPayable <= 0) {
      return res.status(400).json({
        success: false,
        message: "No payable commission now. (nowPayable = 0)",
        debug: {
          customerTotalPaidAmount: n(investment.totalPaidAmount),
          customerMonthly: calc.customerMonthly,
          monthsPaid: calc.monthsPaid,
          brokerMonthly: calc.brokerMonthly,
          unlockedBrokerPayable: calc.unlockedBrokerPayable,
          brokerTotalPaidAmount: n(investment.brokerTotalPaidAmount),
        },
      });
    }

    if (amountPaid > nowPayable) {
      return res.status(400).json({
        success: false,
        message: `payAmount cannot be greater than nowPayable (${nowPayable})`,
        nowPayable,
      });
    }

    const brokerPaidBefore = n(investment.brokerTotalPaidAmount);
    const brokerPaidAfter = brokerPaidBefore + amountPaid;

    const customer = await Customer.findById(investment.customerId).lean();

    const payment = await BrokerPayment.create({
      brokerId: broker._id,
      investmentId: investment._id,
      customerId: investment.customerId,

      paidAmount: amountPaid,

      investmentAmount: n(investment.investmentAmount),
      brokerCommissionRate: n(investment.brokerCommissionRate),
      brokerCommissionTotal: n(calc.brokerCommissionTotal),

      payableUnlocked: true,
      pendingBefore: nowPayable,
      pendingAfter: Math.max(nowPayable - amountPaid, 0),

      note: note ? String(note).trim() : "",
      paidAt: new Date(),
    });

    investment.brokerTotalPaidAmount = brokerPaidAfter;
    investment.brokerLastPaymentAmount = amountPaid;
    investment.brokerLastPaymentDate = payment.paidAt;

    // optional full remaining field
    investment.brokerRemainingPendingAmount = Math.max(
      n(calc.brokerCommissionTotal) - brokerPaidAfter,
      0
    );

    await investment.save();

    return res.status(201).json({
      success: true,
      message: "Broker payment recorded successfully",
      data: {
        broker: { _id: broker._id, nic: broker.nic, name: broker.name },
        customer: customer ? { _id: customer._id, nic: customer.nic, name: customer.name } : null,
        payment,
      },
    });
  } catch (err) {
    console.error("createBrokerPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getBrokerPaymentHistoryByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid broker NIC format" });
    }

    const normalizedNic = String(nic).trim().toUpperCase();
    const broker = await Broker.findOne({ nic: normalizedNic }).lean();
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found" });
    }

    const history = await BrokerPayment.find({ brokerId: broker._id })
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      broker: { _id: broker._id, nic: broker.nic, name: broker.name },
      count: history.length,
      data: history,
    });
  } catch (err) {
    console.error("getBrokerPaymentHistoryByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
