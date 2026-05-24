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

const calcInvestmentCommission = (inv) => {
  const earned = Math.max(n(inv.interestPaidAmount) * (n(inv.brokerCommissionRate) / 100), 0);
  const paid = n(inv.brokerTotalPaidAmount);
  const pending = Math.max(earned - paid, 0);
  return { earned, paid, pending };
};

/**
 * ✅ SHARED: core summary calculation given a broker doc
 */
const buildBrokerSummary = async (broker) => {
  const invs = await Investment.find({ brokerId: broker._id })
    .select(
      "_id customerId investmentAmount investmentInterestRate interestPaidAmount brokerCommissionRate brokerTotalPaidAmount createdAt"
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

    return {
      investmentId: inv._id,
      customer: inv.customerId
        ? { nic: inv.customerId.nic, name: inv.customerId.name }
        : null,
      investmentAmount: n(inv.investmentAmount),
      interestPaidByCustomer: n(inv.interestPaidAmount),
      brokerCommissionRate: n(inv.brokerCommissionRate),
      commissionEarned: Number(calc.earned.toFixed(2)),
      commissionPaid: Number(calc.paid.toFixed(2)),
      commissionPending: Number(calc.pending.toFixed(2)),
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
      rule: "commissionEarned = interestPaidByCustomer × brokerCommissionRate%; pending = totalEarned − totalPaid",
    });
  } catch (err) {
    console.error("getBrokerSummaryByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ GET Broker Summary by MongoDB _id
 * GET /api/broker/payments/broker/id/:id/summary
 *
 * Use this when the broker has no NIC (nic = null) or when you only have the _id.
 * This is what your frontend should call when clicking a broker row,
 * since the broker _id is always available.
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
      rule: "commissionEarned = interestPaidByCustomer × brokerCommissionRate%; pending = totalEarned − totalPaid",
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
 *   OR: { brokerId, payAmount, note }   ← also accepts _id now
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
          "No pending broker commission. Either customers have not paid any interest yet, or all earned commission has already been paid to the broker.",
        totalPending: 0,
      });
    }

    if (amountPaid > Number(totalPending.toFixed(2))) {
      return res.status(400).json({
        success: false,
        message: `payAmount (${amountPaid}) cannot exceed total pending commission (${Number(totalPending.toFixed(2))})`,
        totalPending: Number(totalPending.toFixed(2)),
      });
    }

    let remaining = amountPaid;
    const allocations = [];
    const now = new Date();

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