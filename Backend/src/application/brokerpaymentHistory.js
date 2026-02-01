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

    // ✅ collect ALL investmentIds from allocations
    const investmentIds = [
      ...new Set(
        brokerPayments
          .flatMap((p) => (Array.isArray(p.allocations) ? p.allocations : []))
          .map((a) => String(a.investmentId))
          .filter(Boolean)
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const investments = await Investment.find({ _id: { $in: investmentIds } })
      .select("_id customerId interestPaidAmount brokerCommissionRate brokerTotalPaidAmount")
      .populate("customerId", "nic name")
      .lean();

    const invMap = new Map(investments.map((x) => [String(x._id), x]));

    // ✅ last customer payment date per investment
    const customerPayments = await CustomerPayment.aggregate([
      { $match: { investmentId: { $in: investmentIds } } },
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

    let rows = brokerPayments.map((p) => {
      const allocs = Array.isArray(p.allocations) ? p.allocations : [];

      // ✅ customers involved in this broker payment
      const customers = [];
      const months = [];

      allocs.forEach((a) => {
        const inv = invMap.get(String(a.investmentId));
        if (inv?.customerId) customers.push(inv.customerId);

        const lastPaidAt = lastCustPayMap.get(String(a.investmentId));
        if (lastPaidAt) months.push(monthKey(lastPaidAt));
      });

      // ✅ month range
      let monthRange = "-";
      if (months.length > 0) {
        const sorted = [...months].sort(); // YYYY-MM sorts correctly
        const from = sorted[0];
        const to = sorted[sorted.length - 1];
        monthRange = from === to ? from : `${from} to ${to}`;
      }

      // ✅ payable & pending (based on current investment rollups)
      let totalBrokerPayable = 0;
      let totalBrokerPaid = 0;

      allocs.forEach((a) => {
        const inv = invMap.get(String(a.investmentId));
        if (!inv) return;

        const payable = Math.max(
          n(inv.interestPaidAmount) * (n(inv.brokerCommissionRate) / 100),
          0
        );
        totalBrokerPayable += payable;

        totalBrokerPaid += n(inv.brokerTotalPaidAmount);
      });

      const brokerPendingPayment = Math.max(totalBrokerPayable - totalBrokerPaid, 0);

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

        // ✅ what you asked
        monthRange,
        customers: uniqueCustomers, // optional list of customers

        totalBrokerPayable: n(totalBrokerPayable),
        totalBrokerPaid: n(totalBrokerPaid),
        brokerPendingPayment: n(brokerPendingPayment),

        note: p.note || "",
      };
    });

    // ✅ search filter
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
      formulaUsed: "brokerPayableTotal = totalInterestPaid * (brokerCommissionRate/100)",
    });
  } catch (err) {
    console.error("getBrokerPaymentHistoryTable error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
