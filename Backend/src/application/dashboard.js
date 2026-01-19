// application/dashboard.js
import Investment from "../infastructure/schemas/investement.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";
import BrokerPayment from "../infastructure/schemas/brokerpayment.js";

const monthNamesShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const getRange = ({ year, month, granularity }) => {
  if (granularity === "day") {
    const m = Math.min(12, Math.max(1, month));
    const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    return { start, end };
  }

  if (granularity === "month") {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
    return { start, end };
  }

  const yearsBack = 5;
  const start = new Date(Date.UTC(year - (yearsBack - 1), 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
  return { start, end };
};

const groupKey = (granularity) => {
  if (granularity === "day") return { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } };
  if (granularity === "month") return { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } };
  return { y: { $year: "$createdAt" } };
};

const buildLabels = ({ granularity, year, month }) => {
  if (granularity === "day") {
    const m = Math.min(12, Math.max(1, month));
    const daysInMonth = new Date(year, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  }
  if (granularity === "month") return monthNamesShort.slice();
  return Array.from({ length: 5 }, (_, i) => String(year - 4 + i));
};

const indexFromGroup = ({ granularity, year, _id }) => {
  if (granularity === "day") return Number(_id?.d || 1) - 1;
  if (granularity === "month") return Number(_id?.m || 1) - 1;
  return (Number(_id?.y || year) - (year - 4));
};

export const getDashboardSummary = async (req, res) => {
  try {
    const granularityRaw = String(req.query?.granularity || "month").toLowerCase();
    const granularity = ["day","month","year"].includes(granularityRaw) ? granularityRaw : "month";

    const year = toInt(req.query?.year, new Date().getFullYear());
    const month = toInt(req.query?.month, new Date().getMonth() + 1);

    const { start, end } = getRange({ year, month, granularity });
    const labels = buildLabels({ granularity, year, month });

    const matchCreated = { createdAt: { $gte: start, $lt: end } };

    // ✅ INVESTMENTS
    // interestAmount = investmentAmount * (interestRate/100)
    // brokerCommissionTotal = interestAmount * (brokerCommissionRate/100)  ✅ FIXED
    // profit = interestAmount - brokerCommissionTotal
    const invAgg = await Investment.aggregate([
      { $match: matchCreated },
      {
        $project: {
          createdAt: 1,
          investmentAmount: { $ifNull: ["$investmentAmount", 0] },
          investmentInterestRate: { $ifNull: ["$investmentInterestRate", 0] },
          brokerCommissionRate: { $ifNull: ["$brokerCommissionRate", 0] },

          interestAmount: {
            $multiply: [
              { $ifNull: ["$investmentAmount", 0] },
              { $divide: [{ $ifNull: ["$investmentInterestRate", 0] }, 100] },
            ],
          },
        },
      },
      {
        $addFields: {
          brokerCommissionTotal: {
            $multiply: [
              "$interestAmount",
              { $divide: [{ $ifNull: ["$brokerCommissionRate", 0] }, 100] },
            ],
          },
        },
      },
      {
        $addFields: {
          profit: { $subtract: ["$interestAmount", "$brokerCommissionTotal"] },
        },
      },
      {
        $group: {
          _id: groupKey(granularity),
          totalInvestment: { $sum: "$investmentAmount" },
          totalInterest: { $sum: "$interestAmount" },
          totalBrokerCommission: { $sum: "$brokerCommissionTotal" },
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    // ✅ CUSTOMER PAYMENTS RECEIVED (money in)
    const customerPayAgg = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } }, // ✅ use paidAt for payment time
      { $group: { _id: groupKey(granularity), totalCustomerPay: { $sum: { $ifNull: ["$paidAmount", 0] } } } },
    ]);

    // ✅ BROKER PAYMENTS PAID (money out)
    const brokerPayAgg = await BrokerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } }, // ✅ use paidAt for payment time
      { $group: { _id: groupKey(granularity), totalBrokerPay: { $sum: { $ifNull: ["$paidAmount", 0] } } } },
    ]);

    const series = {
      investment: Array(labels.length).fill(0),
      brokerCommission: Array(labels.length).fill(0),
      profit: Array(labels.length).fill(0),
      customerPay: Array(labels.length).fill(0),
      brokerPay: Array(labels.length).fill(0),
    };

    for (const row of invAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.investment[idx] = Number(row.totalInvestment || 0);
        series.brokerCommission[idx] = Number(row.totalBrokerCommission || 0);
        series.profit[idx] = Number(row.totalProfit || 0);
      }
    }

    for (const row of customerPayAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) series.customerPay[idx] = Number(row.totalCustomerPay || 0);
    }

    for (const row of brokerPayAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) series.brokerPay[idx] = Number(row.totalBrokerPay || 0);
    }

    const totals = {
      totalInvestment: series.investment.reduce((a, b) => a + b, 0),
      totalBrokerCommission: series.brokerCommission.reduce((a, b) => a + b, 0),
      totalProfit: series.profit.reduce((a, b) => a + b, 0),
      totalCustomerPay: series.customerPay.reduce((a, b) => a + b, 0),
      totalBrokerPay: series.brokerPay.reduce((a, b) => a + b, 0),
    };

    // Monthly Review by selected month/year (payments should use paidAt)
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const [monthlyInv] = await Investment.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, totalInvestmentThisMonth: { $sum: { $ifNull: ["$investmentAmount", 0] } } } },
    ]);

    const [monthlyCustomerPay] = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, totalCustomerPayThisMonth: { $sum: { $ifNull: ["$paidAmount", 0] } } } },
    ]);

    const [monthlyBrokerPay] = await BrokerPayment.aggregate([
      { $match: { paidAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, totalBrokerPayThisMonth: { $sum: { $ifNull: ["$paidAmount", 0] } } } },
    ]);

    const review = {
      monthLabel: monthNamesShort[month - 1],
      customerPayThisMonth: Number(monthlyCustomerPay?.totalCustomerPayThisMonth || 0),
      brokerPayThisMonth: Number(monthlyBrokerPay?.totalBrokerPayThisMonth || 0),
      investmentThisMonth: Number(monthlyInv?.totalInvestmentThisMonth || 0),
    };

    return res.status(200).json({
      success: true,
      params: { granularity, year, month, from: start, to: end },
      labels,
      series,
      totals,
      monthlyReview: review,
      note: {
        brokerCommissionFormula: "brokerCommissionTotal = (investmentAmount*(investmentInterestRate/100))*(brokerCommissionRate/100)",
        profitFormula: "profit = interestAmount - brokerCommissionTotal",
        flow: "Customers pay you (CustomerPayment.paidAt). You pay brokers (BrokerPayment.paidAt).",
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
