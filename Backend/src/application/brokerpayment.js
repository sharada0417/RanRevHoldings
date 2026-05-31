import mongoose from "mongoose";
import Broker from "../infastructure/schemas/broker.js";
import Investment from "../infastructure/schemas/investement.js";
import BrokerPayment from "../infastructure/schemas/brokerpayment.js";

const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

const n = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/**
 * ✅ FIXED COMMISSION UNLOCK LOGIC
 *
 * Broker commission is ONLY unlocked when the customer actually PAYS interest.
 * It is NOT unlocked just because time passes (cycles complete).
 *
 * Logic:
 *   monthlyBrokerCommission = investmentAmount × brokerCommissionRate / 100
 *   monthlyTotalInterest    = investmentAmount × investmentInterestRate / 100
 *
 *   brokerCommissionEarned  = interestPaidAmount × (brokerRate / totalRate)
 *                           = customer's actual interest paid × broker's share ratio
 *
 *   brokerCommissionPending = brokerCommissionEarned − brokerTotalPaidAmount
 *
 * Example:
 *   investmentAmount = 100,000 | totalRate = 10% | brokerRate = 1%
 *   monthlyTotal  = 10,000  |  monthlyBroker = 1,000
 *   brokerRatio   = 1/10 = 0.1  (broker gets 10% of whatever customer pays as interest)
 *
 *   Customer pays 10,000 interest → broker earns 1,000
 *   Customer pays  5,000 interest (partial) → broker earns 500
 *   Customer pays  0    interest → broker earns 0  ✅
 */
const calcInvestmentCommission = (inv) => {
  const principal = n(inv.investmentAmount);
  const totalRate = n(inv.investmentInterestRate);
  const commRate = n(inv.brokerCommissionRate);

  const monthlyTotalInterest = (principal * totalRate) / 100;
  const monthlyBrokerCommission = (principal * commRate) / 100;

  // Ratio of broker's share in total interest (avoids division by zero)
  const brokerRatio = monthlyTotalInterest > 0 ? monthlyBrokerCommission / monthlyTotalInterest : 0;

  // Commission is unlocked proportionally to actual customer interest paid
  const interestPaid = n(inv.interestPaidAmount);
  const earned = interestPaid * brokerRatio;

  // Already paid to broker
  const paid = n(inv.brokerTotalPaidAmount);

  // Still pending (can't go negative)
  const pending = Math.max(earned - paid, 0);

  return {
    monthlyTotalInterest: Number(monthlyTotalInterest.toFixed(2)),
    monthlyBrokerCommission: Number(monthlyBrokerCommission.toFixed(2)),
    brokerRatio,
    interestPaidByCustomer: Number(interestPaid.toFixed(2)),
    earned: Number(earned.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    pending: Number(pending.toFixed(2)),
  };
};

/**
 * ✅ SHARED: core summary calculation given a broker doc
 */
const buildBrokerSummary = async (broker) => {
  const invs = await Investment.find({ brokerId: broker._id })
    .select(
      "_id customerId investmentAmount investmentInterestRate brokerCommissionRate brokerTotalPaidAmount interestPaidAmount startDate createdAt"
    )
    .populate("customerId", "nic name")
    .sort({ createdAt: 1 })
    .lean();

  let totalEarned = 0;
  let totalPaid = 0;

  const perInvestment = invs.map((inv) => {
    const calc = calcInvestmentCommission(inv);
    totalEarned += calc.earned;
    totalPaid += calc.paid;

    const principal = n(inv.investmentAmount);
    const totalRate = n(inv.investmentInterestRate);
    const commRate = n(inv.brokerCommissionRate);
    const ownerRate = totalRate - commRate;

    return {
      investmentId: inv._id,
      customer: inv.customerId
        ? { nic: inv.customerId.nic, name: inv.customerId.name }
        : null,
      investmentAmount: principal,
      investmentInterestRate: totalRate,
      brokerCommissionRate: commRate,
      ownerInterestRate: ownerRate,
      monthlyTotalInterest: calc.monthlyTotalInterest,
      monthlyOwnerInterest: Number(((principal * ownerRate) / 100).toFixed(2)),
      monthlyBrokerCommission: calc.monthlyBrokerCommission,
      interestPaidByCustomer: calc.interestPaidByCustomer,
      commissionEarned: calc.earned,
      commissionPaid: calc.paid,
      commissionPending: calc.pending,
      note: "Broker commission unlocks only when customer pays interest (earned = interestPaid × brokerRate/totalRate)",
    };
  });

  totalEarned = Number(totalEarned.toFixed(2));
  totalPaid = Number(totalPaid.toFixed(2));
  const pending = Number(Math.max(totalEarned - totalPaid, 0).toFixed(2));

  return { totalEarned, totalPaid, pending, perInvestment };
};

/**
 * ✅ GET Broker Summary by NIC
 * GET /api/broker/payments/broker/:nic/summary
 */
export const getBrokerSummaryByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid broker NIC format" });
    }

    const broker = await Broker.findOne({
      nic: String(nic).trim().toUpperCase(),
    }).lean();
    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found for this NIC" });
    }

    const summary = await buildBrokerSummary(broker);

    return res.status(200).json({
      success: true,
      broker: { _id: broker._id, nic: broker.nic, name: broker.name },
      totals: {
        totalEarned: summary.totalEarned,
        totalPaid: summary.totalPaid,
        pending: summary.pending,
      },
      perInvestment: summary.perInvestment,
      rule: "Broker commission unlocks ONLY when customer pays interest. earned = interestPaid × (brokerRate / totalRate). pending = earned − totalBrokerPaid",
    });
  } catch (err) {
    console.error("getBrokerSummaryByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Broker Summary by MongoDB _id
 * GET /api/broker/payments/broker/id/:id/summary
 */
export const getBrokerSummaryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid broker id" });
    }

    const broker = await Broker.findById(id).lean();
    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });
    }

    const summary = await buildBrokerSummary(broker);

    return res.status(200).json({
      success: true,
      broker: { _id: broker._id, nic: broker.nic, name: broker.name },
      totals: {
        totalEarned: summary.totalEarned,
        totalPaid: summary.totalPaid,
        pending: summary.pending,
      },
      perInvestment: summary.perInvestment,
      rule: "Broker commission unlocks ONLY when customer pays interest. earned = interestPaid × (brokerRate / totalRate). pending = earned − totalBrokerPaid",
    });
  } catch (err) {
    console.error("getBrokerSummaryById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ POST Broker Simple Payment
 * POST /api/broker/payments/pay
 * body: { brokerNic, payAmount, note }
 *   OR: { brokerId, payAmount, note }
 */
export const createBrokerSimplePayment = async (req, res) => {
  try {
    const { brokerNic, brokerId: brokerIdRaw, payAmount, note } = req.body || {};

    if ((!brokerNic && !brokerIdRaw) || payAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "brokerNic (or brokerId) and payAmount are required",
      });
    }

    const amountPaid = Number(payAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "payAmount must be > 0" });
    }

    let broker;

    if (brokerNic) {
      if (!isValidSriLankaNIC(brokerNic)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid broker NIC format" });
      }
      broker = await Broker.findOne({
        nic: String(brokerNic).trim().toUpperCase(),
      });
    } else {
      if (!mongoose.Types.ObjectId.isValid(brokerIdRaw)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid brokerId" });
      }
      broker = await Broker.findById(brokerIdRaw);
    }

    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });
    }

    const now = new Date();

    const invs = await Investment.find({ brokerId: broker._id }).sort({
      createdAt: 1,
    });

    const rows = invs.map((inv) => {
      const calc = calcInvestmentCommission(inv);
      return { inv, ...calc };
    });

    const totalPending = rows.reduce((s, x) => s + n(x.pending), 0);

    if (totalPending <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "No pending broker commission. Commission only unlocks when the customer pays interest. Either no interest has been paid yet, or all earned commission is already paid.",
        totalPending: 0,
      });
    }

    if (amountPaid > Number(totalPending.toFixed(2))) {
      return res.status(400).json({
        success: false,
        message: `payAmount (${amountPaid}) cannot exceed total pending commission (${Number(
          totalPending.toFixed(2)
        )})`,
        totalPending: Number(totalPending.toFixed(2)),
      });
    }

    let remaining = amountPaid;
    const allocations = [];

    for (const r of rows) {
      if (remaining <= 0) break;
      if (r.pending <= 0) continue;

      const take = Math.min(r.pending, remaining);
      remaining -= take;

      allocations.push({
        investmentId: r.inv._id,
        amount: Number(take.toFixed(2)),
      });

      r.inv.brokerTotalPaidAmount = n(r.inv.brokerTotalPaidAmount) + take;
      r.inv.brokerLastPaymentAmount = take;
      r.inv.brokerLastPaymentDate = now;

      await r.inv.save();
    }

    const payment = await BrokerPayment.create({
      brokerId: broker._id,
      paidAmount: amountPaid,
      allocations,
      note: note ? String(note).trim() : "",
      paidAt: now,
    });

    return res.status(201).json({
      success: true,
      message: "Broker payment recorded successfully",
      data: {
        broker: { _id: broker._id, nic: broker.nic, name: broker.name },
        payment,
        totalPendingBefore: Number(totalPending.toFixed(2)),
        totalPendingAfter: Number(Math.max(totalPending - amountPaid, 0).toFixed(2)),
        allocations,
      },
    });
  } catch (err) {
    console.error("createBrokerSimplePayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};