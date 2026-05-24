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

export const getBrokerPaymentHistoryTable = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim().toLowerCase();

    const brokerPayments = await BrokerPayment.find({})
      .populate("brokerId", "nic name")
      .sort({ paidAt: -1 })
      .lean();

    if (!brokerPayments.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // ✅ Collect all unique brokerIds from the payment records
    const brokerIdSet = new Set(
      brokerPayments.map((p) => String(p.brokerId?._id || p.brokerId)).filter(Boolean)
    );
    const brokerObjectIds = [...brokerIdSet].map((id) => new mongoose.Types.ObjectId(id));

    // ✅ FIX: Fetch ALL investments for ALL brokers in these payments
    //    NOT just investments in payment allocations.
    //    This ensures pending = sum across ALL broker investments, not just
    //    the ones that happened to appear in a specific past payment.
    const allBrokerInvestments = await Investment.find({ brokerId: { $in: brokerObjectIds } })
      .select("_id brokerId customerId interestPaidAmount brokerCommissionRate brokerTotalPaidAmount")
      .populate("customerId", "nic name")
      .lean();

    // ✅ Build per-broker global pending map
    //    pending = sum over ALL broker investments of:
    //      (interestPaidAmount × brokerCommissionRate%) − brokerTotalPaidAmount
    //
    //    Example:
    //      Customer 1 investment: interestPaid=10000, commRate=10%, brokerPaid=0 → pending=1000
    //      Customer 2 investment: interestPaid=10000, commRate=10%, brokerPaid=0 → pending=1000
    //      Broker global pending = 2000 ✅
    const brokerGlobalPendingMap = new Map(); // brokerId → { totalPayable, totalPaid, pending }

    for (const inv of allBrokerInvestments) {
      const bKey = String(inv.brokerId);
      if (!brokerGlobalPendingMap.has(bKey)) {
        brokerGlobalPendingMap.set(bKey, { totalPayable: 0, totalPaid: 0 });
      }

      const entry = brokerGlobalPendingMap.get(bKey);

      // Commission earned so far = interest customer paid × broker rate
      const payable = Math.max(
        n(inv.interestPaidAmount) * (n(inv.brokerCommissionRate) / 100),
        0
      );

      // Commission already paid to broker (cumulative on this investment)
      const paid = n(inv.brokerTotalPaidAmount);

      entry.totalPayable += payable;
      entry.totalPaid += paid;
    }

    // Finalize pending per broker
    const brokerPendingMap = new Map();
    for (const [bKey, entry] of brokerGlobalPendingMap) {
      brokerPendingMap.set(bKey, {
        totalPayable: Number(entry.totalPayable.toFixed(2)),
        totalPaid: Number(entry.totalPaid.toFixed(2)),
        pending: Number(Math.max(entry.totalPayable - entry.totalPaid, 0).toFixed(2)),
      });
    }

    // ✅ Collect investmentIds from allocations (for customer lookup + month range)
    const allocationInvestmentIds = [
      ...new Set(
        brokerPayments
          .flatMap((p) => (Array.isArray(p.allocations) ? p.allocations : []))
          .map((a) => String(a.investmentId))
          .filter(Boolean)
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    // Build a quick map of investmentId → investment (from allBrokerInvestments)
    const invMap = new Map(allBrokerInvestments.map((x) => [String(x._id), x]));

    // ✅ Last customer payment date per investment (for month range display)
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

    // ✅ Build history rows
    let rows = brokerPayments.map((p) => {
      const allocs = Array.isArray(p.allocations) ? p.allocations : [];
      const bKey = String(p.brokerId?._id || p.brokerId);

      // Customers involved in THIS payment's allocations
      const customers = [];
      const months = [];

      allocs.forEach((a) => {
        const inv = invMap.get(String(a.investmentId));
        if (inv?.customerId) customers.push(inv.customerId);

        const lastPaidAt = lastCustPayMap.get(String(a.investmentId));
        if (lastPaidAt) months.push(monthKey(lastPaidAt));
      });

      // Month range (from customer payment dates in this allocation)
      let monthRange = "-";
      if (months.length > 0) {
        const sorted = [...months].sort();
        const from = sorted[0];
        const to = sorted[sorted.length - 1];
        monthRange = from === to ? from : `${from} to ${to}`;
      }

      // ✅ Use GLOBAL broker pending (all investments, not just this allocation)
      const brokerGlobal = brokerPendingMap.get(bKey) || {
        totalPayable: 0,
        totalPaid: 0,
        pending: 0,
      };

      // Deduplicate customers
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
        brokerNic: p.brokerId?.nic || "-",

        brokerPaidAmount: n(p.paidAmount),
        brokerPaidMonth: monthKey(p.paidAt),
        brokerPaidDateTime: formatDateTime(p.paidAt),

        monthRange,
        customers: uniqueCustomers,

        // ✅ FIXED: these now reflect the broker's GLOBAL commission state,
        //    not just the investments in this one payment's allocations.
        //
        //    totalBrokerPayable = commission earned across ALL broker investments
        //    totalBrokerPaid    = commission already paid across ALL broker investments
        //    brokerPendingPayment = what we still owe the broker RIGHT NOW
        totalBrokerPayable: brokerGlobal.totalPayable,
        totalBrokerPaid: brokerGlobal.totalPaid,
        brokerPendingPayment: brokerGlobal.pending,

        note: p.note || "",
      };
    });

    // Search filter
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
        "brokerPendingPayment = (sum of interestPaidAmount × brokerCommissionRate% across ALL broker investments) − (sum of brokerTotalPaidAmount across ALL broker investments)",
    });
  } catch (err) {
    console.error("getBrokerPaymentHistoryTable error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};