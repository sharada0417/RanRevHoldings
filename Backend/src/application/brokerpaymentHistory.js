// application/brokerpaymentHistory.js
import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import BrokerPayment from "../infastructure/schemas/brokerpayment.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

const n = (x) => Number(x || 0);

const calcInterestAmount = (investmentAmount, interestRatePercent) =>
  n(investmentAmount) * (n(interestRatePercent) / 100);

// ✅ broker payable total = interest * commissionRate/100
const calcBrokerPayableTotal = (investmentAmount, interestRatePercent, brokerRatePercent) => {
  const interest = calcInterestAmount(investmentAmount, interestRatePercent);
  return interest * (n(brokerRatePercent) / 100);
};

const monthKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const getBrokerPaymentHistoryTable = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim().toLowerCase();

    const brokerPayments = await BrokerPayment.find({})
      .populate("brokerId", "nic name")
      .populate("customerId", "nic name")
      .sort({ paidAt: -1 })
      .lean();

    if (!brokerPayments.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const investmentIds = [
      ...new Set(brokerPayments.map((p) => String(p.investmentId)).filter(Boolean)),
    ].map((id) => new mongoose.Types.ObjectId(id));

    // ✅ include interest rate too
    const investments = await Investment.find({ _id: { $in: investmentIds } })
      .select(
        "_id investmentAmount investmentInterestRate brokerCommissionRate brokerTotalPaidAmount brokerRemainingPendingAmount createdAt"
      )
      .lean();

    const invMap = new Map(investments.map((x) => [String(x._id), x]));

    const customerPayments = await CustomerPayment.aggregate([
      { $match: { investmentId: { $in: investmentIds } } },
      { $sort: { paidAt: -1 } },
      {
        $group: {
          _id: "$investmentId",
          paidAt: { $first: "$paidAt" },
          paidAmount: { $first: "$paidAmount" },
        },
      },
    ]);

    const custPayMap = new Map(
      customerPayments.map((x) => [String(x._id), { paidAt: x.paidAt, paidAmount: x.paidAmount }])
    );

    let rows = brokerPayments.map((p) => {
      const inv = invMap.get(String(p.investmentId));
      const lastCustomerPay = custPayMap.get(String(p.investmentId));

      const totalCommission = inv
        ? calcBrokerPayableTotal(inv.investmentAmount, inv.investmentInterestRate, inv.brokerCommissionRate)
        : n(p.brokerCommissionTotal); // fallback snapshot

      const brokerPaidTotal = inv ? n(inv.brokerTotalPaidAmount) : 0;

      const brokerPending = inv
        ? inv.brokerRemainingPendingAmount === null || inv.brokerRemainingPendingAmount === undefined
          ? Math.max(totalCommission - brokerPaidTotal, 0)
          : n(inv.brokerRemainingPendingAmount)
        : n(p.pendingAfter || 0);

      return {
        brokerPaymentId: p._id,
        brokerPaidAt: p.paidAt,
        brokerPaidMonth: monthKey(p.paidAt),
        brokerPaidAmount: n(p.paidAmount),

        brokerName: p.brokerId?.name || "-",
        brokerNic: p.brokerId?.nic || "-",

        customerName: p.customerId?.name || "-",
        customerNic: p.customerId?.nic || "-",

        customerPayMonth: lastCustomerPay?.paidAt ? monthKey(lastCustomerPay.paidAt) : "-",
        customerPayAmount: n(lastCustomerPay?.paidAmount),

        totalBrokerPayable: n(totalCommission),
        totalBrokerPaid: brokerPaidTotal,
        brokerPendingPayment: n(brokerPending),
      };
    });

    if (search) {
      rows = rows.filter((r) => {
        const str = `${r.brokerName} ${r.brokerNic} ${r.customerName} ${r.customerNic}`.toLowerCase();
        return str.includes(search);
      });
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      formulaUsed: "brokerPayableTotal = (investmentAmount*(interestRate/100))*(brokerCommissionRate/100)",
    });
  } catch (err) {
    console.error("getBrokerPaymentHistoryTable error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
