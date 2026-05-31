// backend/application/brokerpaymentHistory.js

import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import BrokerPayment from "../infastructure/schemas/brokerpayment.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

const n = (x) => Number(x || 0);

const monthKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const formatDateTime = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

/**
 * ✅ FIXED COMMISSION UNLOCK LOGIC — MATCHES brokerpayment.js
 *
 * Broker commission is ONLY unlocked when the customer actually PAYS interest.
 * It is NOT unlocked just because time/cycles pass.
 *
 *   monthlyTotalInterest    = investmentAmount × totalRate / 100
 *   monthlyBrokerCommission = investmentAmount × brokerRate / 100
 *   brokerRatio             = monthlyBrokerCommission / monthlyTotalInterest
 *                           = brokerRate / totalRate
 *
 *   earned  = inv.interestPaidAmount × brokerRatio
 *   paid    = inv.brokerTotalPaidAmount
 *   pending = max(earned - paid, 0)
 *
 * This is identical to the logic in brokerpayment.js buildBrokerSummary / calcInvestmentCommission.
 */
const calcBrokerCommissionForInv = (inv) => {
  const principal     = n(inv.investmentAmount);
  const totalRate     = n(inv.investmentInterestRate);
  const commRate      = n(inv.brokerCommissionRate);
  const interestPaid  = n(inv.interestPaidAmount);   // ✅ actual customer interest paid

  const monthlyTotalInterest    = (principal * totalRate) / 100;
  const monthlyBrokerCommission = (principal * commRate) / 100;

  // Broker's share ratio — guard against zero totalRate
  const brokerRatio = monthlyTotalInterest > 0
    ? monthlyBrokerCommission / monthlyTotalInterest
    : 0;

  // Commission earned = proportional to actual interest paid by customer
  const earned  = interestPaid * brokerRatio;
  const paid    = n(inv.brokerTotalPaidAmount);
  const pending = Math.max(earned - paid, 0);

  return {
    monthlyTotalInterest:    Number(monthlyTotalInterest.toFixed(2)),
    monthlyBrokerCommission: Number(monthlyBrokerCommission.toFixed(2)),
    brokerRatio,
    interestPaidByCustomer:  Number(interestPaid.toFixed(2)),
    earned:  Number(earned.toFixed(2)),
    paid:    Number(paid.toFixed(2)),
    pending: Number(pending.toFixed(2)),
  };
};

export const getBrokerPaymentHistoryTable = async (req, res) => {
  try {
    const now = new Date();
    const search = String(req.query.search || "").trim().toLowerCase();

    const brokerPayments = await BrokerPayment.find({})
      .populate("brokerId", "nic name")
      .sort({ paidAt: -1 })
      .lean();

    if (!brokerPayments.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Collect all unique brokerIds from the payment records
    const brokerIdSet = new Set(
      brokerPayments
        .map((p) => String(p.brokerId?._id || p.brokerId))
        .filter(Boolean)
    );
    const brokerObjectIds = [...brokerIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Fetch ALL investments for ALL brokers in these payments
    // ✅ Include interestPaidAmount so the new commission calc works
    const allBrokerInvestments = await Investment.find({
      brokerId: { $in: brokerObjectIds },
    })
      .select(
        "_id brokerId customerId investmentAmount investmentInterestRate " +
        "brokerCommissionRate brokerTotalPaidAmount interestPaidAmount startDate"
      )
      .populate("customerId", "nic name")
      .lean();

    // ✅ Build per-broker global pending map using FIXED interestPaid-based logic
    const brokerGlobalPendingMap = new Map();

    for (const inv of allBrokerInvestments) {
      const bKey = String(inv.brokerId);
      if (!brokerGlobalPendingMap.has(bKey)) {
        brokerGlobalPendingMap.set(bKey, { totalEarned: 0, totalPaid: 0 });
      }

      const entry = brokerGlobalPendingMap.get(bKey);
      const calc  = calcBrokerCommissionForInv(inv);   // ✅ uses interestPaid, not cycles

      entry.totalEarned += calc.earned;
      entry.totalPaid   += calc.paid;
    }

    // Finalize pending per broker
    const brokerPendingMap = new Map();
    for (const [bKey, entry] of brokerGlobalPendingMap) {
      brokerPendingMap.set(bKey, {
        totalEarned: Number(entry.totalEarned.toFixed(2)),
        totalPaid:   Number(entry.totalPaid.toFixed(2)),
        pending:     Number(Math.max(entry.totalEarned - entry.totalPaid, 0).toFixed(2)),
      });
    }

    // Collect investmentIds from allocations (for customer lookup + month range)
    const allocationInvestmentIds = [
      ...new Set(
        brokerPayments
          .flatMap((p) => (Array.isArray(p.allocations) ? p.allocations : []))
          .map((a) => String(a.investmentId))
          .filter(Boolean)
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    // Quick map of investmentId → investment
    const invMap = new Map(
      allBrokerInvestments.map((x) => [String(x._id), x])
    );

    // Last customer payment date per investment (for month-range display)
    const customerPayments = await CustomerPayment.aggregate([
      { $match: { investmentId: { $in: allocationInvestmentIds } } },
      { $sort: { paidAt: -1 } },
      {
        $group: {
          _id: "$investmentId",
          lastPaidAt: { $first: "$paidAt" },
        },
      },
    ]);

    const lastCustPayMap = new Map(
      customerPayments.map((x) => [String(x._id), x.lastPaidAt])
    );

    // Build history rows
    let rows = brokerPayments.map((p) => {
      const allocs = Array.isArray(p.allocations) ? p.allocations : [];
      const bKey   = String(p.brokerId?._id || p.brokerId);

      const customers = [];
      const months    = [];

      allocs.forEach((a) => {
        const inv = invMap.get(String(a.investmentId));
        if (inv?.customerId) customers.push(inv.customerId);

        const lastPaidAt = lastCustPayMap.get(String(a.investmentId));
        if (lastPaidAt) months.push(monthKey(lastPaidAt));
      });

      let monthRange = "-";
      if (months.length > 0) {
        const sorted = [...months].sort();
        const from   = sorted[0];
        const to     = sorted[sorted.length - 1];
        monthRange   = from === to ? from : `${from} to ${to}`;
      }

      // ✅ Use GLOBAL broker pending — interestPaid-based, same as summary endpoint
      const brokerGlobal = brokerPendingMap.get(bKey) || {
        totalEarned: 0,
        totalPaid:   0,
        pending:     0,
      };

      const uniqueCustomers = [];
      const seen = new Set();
      for (const c of customers) {
        const key = String(c._id);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCustomers.push({ name: c.name, nic: c.nic });
        }
      }

      return {
        brokerPaymentId: p._id,

        brokerName: p.brokerId?.name || "-",
        brokerNic:  p.brokerId?.nic  || "-",

        brokerPaidAmount:   n(p.paidAmount),
        brokerPaidMonth:    monthKey(p.paidAt),
        brokerPaidDateTime: formatDateTime(p.paidAt),

        monthRange,
        customers: uniqueCustomers,

        // ✅ FIXED: interestPaid-based totals (consistent with summary page)
        totalBrokerEarned:  brokerGlobal.totalEarned,
        totalBrokerPaid:    brokerGlobal.totalPaid,
        brokerPendingPayment: brokerGlobal.pending,

        note: p.note || "",
      };
    });

    if (search) {
      rows = rows.filter((r) => {
        const customerText = (r.customers || [])
          .map((c) => `${c.name} ${c.nic}`)
          .join(" ");
        const str = `${r.brokerName} ${r.brokerNic} ${customerText}`.toLowerCase();
        return str.includes(search);
      });
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      formulaUsed:
        "earned = interestPaidByCustomer × (brokerRate / totalRate); " +
        "pending = totalEarned − totalBrokerPaid. " +
        "Commission only unlocks when customer actually pays interest.",
    });
  } catch (err) {
    console.error("getBrokerPaymentHistoryTable error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};