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

const buildLabels = ({ granularity, year, month }) => {
  if (granularity === "day") {
    const m = Math.min(12, Math.max(1, month));
    const daysInMonth = new Date(year, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  }
  if (granularity === "month") return monthNamesShort.slice();
  return Array.from({ length: 5 }, (_, i) => String(year - 4 + i));
};

// ✅ group key by ANY date field (createdAt / paidAt)
const groupKeyBy = (granularity, fieldPath) => {
  const f = fieldPath; // e.g. "$createdAt" or "$paidAt"
  if (granularity === "day") return { y: { $year: f }, m: { $month: f }, d: { $dayOfMonth: f } };
  if (granularity === "month") return { y: { $year: f }, m: { $month: f } };
  return { y: { $year: f } };
};

const indexFromGroup = ({ granularity, year, _id }) => {
  if (granularity === "day") return Number(_id?.d || 1) - 1;
  if (granularity === "month") return Number(_id?.m || 1) - 1;
  return Number(_id?.y || year) - (year - 4);
};

export const getDashboardSummary = async (req, res) => {
  try {
    const granularityRaw = String(req.query?.granularity || "month").toLowerCase();
    const granularity = ["day", "month", "year"].includes(granularityRaw) ? granularityRaw : "month";

    const year = toInt(req.query?.year, new Date().getFullYear());
    const month = toInt(req.query?.month, new Date().getMonth() + 1);

    const { start, end } = getRange({ year, month, granularity });
    const labels = buildLabels({ granularity, year, month });

    // ✅ INVESTMENTS (by createdAt)
    const invAgg = await Investment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
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
      { $addFields: { theoreticalProfit: { $subtract: ["$interestAmount", "$brokerCommissionTotal"] } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$createdAt"),
          totalInvestment: { $sum: "$investmentAmount" },
          totalInterest: { $sum: "$interestAmount" },
          totalBrokerCommission: { $sum: "$brokerCommissionTotal" },
          totalTheoreticalProfit: { $sum: "$theoreticalProfit" },
        },
      },
    ]);

    // ✅ CUSTOMER PAYMENTS RECEIVED (by paidAt)
    const customerPayAgg = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$paidAt"),
          totalCustomerPay: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    // ✅ BROKER PAYMENTS PAID (by paidAt)
    const brokerPayAgg = await BrokerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$paidAt"),
          totalBrokerPay: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    // ✅ series (what frontend charts read)
    const series = {
      investment: Array(labels.length).fill(0),

      // calculated (optional, still kept)
      brokerCommission: Array(labels.length).fill(0),
      theoreticalProfit: Array(labels.length).fill(0),

      // money flow (IMPORTANT)
      customerPay: Array(labels.length).fill(0), // money in
      brokerPay: Array(labels.length).fill(0),   // money out

      // ✅ REAL PROFIT (money in - money out)
      realProfit: Array(labels.length).fill(0),
    };

    for (const row of invAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.investment[idx] = Number(row.totalInvestment || 0);
        series.brokerCommission[idx] = Number(row.totalBrokerCommission || 0);
        series.theoreticalProfit[idx] = Number(row.totalTheoreticalProfit || 0);
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

    // ✅ compute realProfit AFTER filling both payment series
    for (let i = 0; i < labels.length; i++) {
      series.realProfit[i] = Number(series.customerPay[i] || 0) - Number(series.brokerPay[i] || 0);
    }

    const totals = {
      totalInvestment: series.investment.reduce((a, b) => a + b, 0),

      // calculated (optional)
      totalBrokerCommission: series.brokerCommission.reduce((a, b) => a + b, 0),
      totalTheoreticalProfit: series.theoreticalProfit.reduce((a, b) => a + b, 0),

      // money flow
      totalCustomerPay: series.customerPay.reduce((a, b) => a + b, 0),
      totalBrokerPay: series.brokerPay.reduce((a, b) => a + b, 0),

      // ✅ REAL PROFIT TOTAL
      totalRealProfit: series.realProfit.reduce((a, b) => a + b, 0),
    };

    // ✅ Monthly Review (always for selected month/year)
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

    const customerPayThisMonth = Number(monthlyCustomerPay?.totalCustomerPayThisMonth || 0);
    const brokerPayThisMonth = Number(monthlyBrokerPay?.totalBrokerPayThisMonth || 0);

    const review = {
      monthLabel: monthNamesShort[month - 1],
      customerPayThisMonth,
      brokerPayThisMonth,
      realProfitThisMonth: customerPayThisMonth - brokerPayThisMonth,
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
        flow: "Customers pay you (CustomerPayment.paidAt). You pay brokers (BrokerPayment.paidAt).",
        realProfitFormula: "realProfit = customerPay - brokerPay",
        theoreticalProfitFormula:
          "theoreticalProfit = (investmentAmount*(investmentInterestRate/100)) - ((investmentAmount*(investmentInterestRate/100))*(brokerCommissionRate/100))",
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
