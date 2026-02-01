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

// ✅ unlocked commission based ONLY on interest PAID
const calcUnlockedCommissionTotal = (interestPaidAmount, brokerCommissionRate) => {
  return Math.max(n(interestPaidAmount) * (n(brokerCommissionRate) / 100), 0);
};

// pending per investment
const calcInvestmentPending = (inv) => {
  const totalCommission = calcUnlockedCommissionTotal(
    inv.interestPaidAmount,
    inv.brokerCommissionRate
  );
  const paid = n(inv.brokerTotalPaidAmount);

  return {
    totalCommission,
    paid,
    pending: Math.max(totalCommission - paid, 0),
  };
};

/**
 * ✅ GET Broker Summary (for View Brokers page)
 * GET /api/broker/payments/broker/:nic/summary
 * returns: totalCommission (all investments), pending (unpaid)
 */
export const getBrokerSummaryByNic = async (req, res) => {
  try {
    const { nic } = req.params;

    if (!isValidSriLankaNIC(nic)) {
      return res.status(400).json({ success: false, message: "Invalid broker NIC format" });
    }

    const broker = await Broker.findOne({ nic: String(nic).trim().toUpperCase() }).lean();
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found for this NIC" });
    }

    const invs = await Investment.find({ brokerId: broker._id })
      .select("_id interestPaidAmount brokerCommissionRate brokerTotalPaidAmount createdAt")
      .sort({ createdAt: 1 })
      .lean();

    let totalCommission = 0;
    let pending = 0;

    for (const inv of invs) {
      const row = calcInvestmentPending(inv);
      totalCommission += row.totalCommission;
      pending += row.pending;
    }

    totalCommission = Number(totalCommission.toFixed(2));
    pending = Number(pending.toFixed(2));

    return res.status(200).json({
      success: true,
      broker: { _id: broker._id, nic: broker.nic, name: broker.name },
      totals: {
        totalCommission,
        pending,
      },
      rule:
        "totalCommission = sum(interestPaidAmount * brokerCommissionRate%); pending = totalCommission - paidCommission",
    });
  } catch (err) {
    console.error("getBrokerSummaryByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ POST Broker Payment Simple
 * POST /api/broker/payments/pay
 * body: { brokerNic, payAmount, note }
 */
export const createBrokerSimplePayment = async (req, res) => {
  try {
    const { brokerNic, payAmount, note } = req.body || {};

    if (!brokerNic || payAmount === undefined) {
      return res.status(400).json({ success: false, message: "brokerNic and payAmount are required" });
    }

    if (!isValidSriLankaNIC(brokerNic)) {
      return res.status(400).json({ success: false, message: "Invalid broker NIC format" });
    }

    const amountPaid = Number(payAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "payAmount must be > 0" });
    }

    const broker = await Broker.findOne({ nic: String(brokerNic).trim().toUpperCase() });
    if (!broker) return res.status(404).json({ success: false, message: "Broker not found" });

    // load broker investments oldest first
    const invs = await Investment.find({ brokerId: broker._id }).sort({ createdAt: 1 });

    const rows = invs.map((inv) => {
      const { totalCommission, paid, pending } = calcInvestmentPending(inv);
      return { inv, totalCommission, paid, pending };
    });

    const totalPending = rows.reduce((s, x) => s + n(x.pending), 0);

    if (totalPending <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "No pending broker commission now (pending = 0). Customer has not paid enough interest.",
      });
    }

    if (amountPaid > totalPending) {
      return res.status(400).json({
        success: false,
        message: `payAmount cannot be greater than total pending (${Number(totalPending.toFixed(2))})`,
        totalPending: Number(totalPending.toFixed(2)),
      });
    }

    // allocate across investments (oldest pending first)
    let remaining = amountPaid;
    const allocations = [];
    const now = new Date();

    for (const r of rows) {
      if (remaining <= 0) break;
      if (r.pending <= 0) continue;

      const take = Math.min(r.pending, remaining);
      remaining -= take;

      allocations.push({ investmentId: r.inv._id, amount: Number(take.toFixed(2)) });

      // update investment broker rollups
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
      message: "Broker payment recorded",
      data: {
        broker: { _id: broker._id, nic: broker.nic, name: broker.name },
        payment,
        totalPendingBefore: Number(totalPending.toFixed(2)),
        totalPendingAfter: Number((totalPending - amountPaid).toFixed(2)),
      },
    });
  } catch (err) {
    console.error("createBrokerSimplePayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
