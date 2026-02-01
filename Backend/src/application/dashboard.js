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
  const f = fieldPath;
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

    /* =========================================================
       ✅ 1) TOTAL INVESTMENT (FULL Investment Amount)
       ========================================================= */
    const invAgg = await Investment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$createdAt"),
          totalInvestment: { $sum: { $ifNull: ["$investmentAmount", 0] } },
        },
      },
    ]);

    /* =========================================================
       ✅ 2) CUSTOMER PAYMENTS (Money In)
          customerPay = FULL paidAmount (principal + interest)
          customerInterest = ONLY interestPart (for profit)
       ========================================================= */
    const customerPayAgg = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$paidAt"),
          totalCustomerPay: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalCustomerInterest: { $sum: { $ifNull: ["$interestPart", 0] } },
        },
      },
    ]);

    /* =========================================================
       ✅ 3) BROKER PAYMENTS (Commission We Paid)
       ========================================================= */
    const brokerPayAgg = await BrokerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: groupKeyBy(granularity, "$paidAt"),
          totalBrokerPay: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    /* =========================================================
       ✅ SERIES (what frontend reads)
       ========================================================= */
    const series = {
      investment: Array(labels.length).fill(0),

      customerPay: Array(labels.length).fill(0),        // FULL customer paid
      customerInterest: Array(labels.length).fill(0),   // ONLY interest received

      brokerPay: Array(labels.length).fill(0),          // broker commission paid

      // ✅ REAL PROFIT = customerInterest - brokerPay
      realProfit: Array(labels.length).fill(0),
    };

    for (const row of invAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.investment[idx] = Number(row.totalInvestment || 0);
      }
    }

    for (const row of customerPayAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.customerPay[idx] = Number(row.totalCustomerPay || 0);
        series.customerInterest[idx] = Number(row.totalCustomerInterest || 0);
      }
    }

    for (const row of brokerPayAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.brokerPay[idx] = Number(row.totalBrokerPay || 0);
      }
    }

    // ✅ REAL PROFIT per bucket
    for (let i = 0; i < labels.length; i++) {
      series.realProfit[i] =
        Number(series.customerInterest[i] || 0) - Number(series.brokerPay[i] || 0);
    }

    /* =========================================================
       ✅ TOTALS (cards)
       ========================================================= */
    const totals = {
      totalInvestment: series.investment.reduce((a, b) => a + b, 0),

      // total broker commission paid
      totalBrokerPay: series.brokerPay.reduce((a, b) => a + b, 0),

      // optional totals (not required but useful)
      totalCustomerPay: series.customerPay.reduce((a, b) => a + b, 0), // full paid
      totalCustomerInterest: series.customerInterest.reduce((a, b) => a + b, 0), // interest only

      // ✅ REAL PROFIT TOTAL
      totalRealProfit: series.realProfit.reduce((a, b) => a + b, 0),
    };

    /* =========================================================
       ✅ Monthly Review (selected month/year)
          - Broker Pay = we pay brokers commission in month
          - Customer Pay = full customer pay in month (principal+interest)
          - Real Profit = customer interest - broker commission (month)
       ========================================================= */
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const [monthlyInv] = await Investment.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
      {
        $group: {
          _id: null,
          totalInvestmentThisMonth: { $sum: { $ifNull: ["$investmentAmount", 0] } },
        },
      },
    ]);

    const [monthlyCustomerPay] = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: monthStart, $lt: monthEnd } } },
      {
        $group: {
          _id: null,
          totalCustomerPayThisMonth: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalCustomerInterestThisMonth: { $sum: { $ifNull: ["$interestPart", 0] } },
        },
      },
    ]);

    const [monthlyBrokerPay] = await BrokerPayment.aggregate([
      { $match: { paidAt: { $gte: monthStart, $lt: monthEnd } } },
      {
        $group: {
          _id: null,
          totalBrokerPayThisMonth: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    const customerPayThisMonth = Number(monthlyCustomerPay?.totalCustomerPayThisMonth || 0);
    const customerInterestThisMonth = Number(monthlyCustomerPay?.totalCustomerInterestThisMonth || 0);
    const brokerPayThisMonth = Number(monthlyBrokerPay?.totalBrokerPayThisMonth || 0);

    const review = {
      monthLabel: monthNamesShort[month - 1],

      // ✅ meanings you asked
      customerPayThisMonth,          // FULL customer paid (principal + interest)
      brokerPayThisMonth,            // broker commission paid
      realProfitThisMonth: customerInterestThisMonth - brokerPayThisMonth,

      // extra (helps UI if needed)
      customerInterestThisMonth,
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
        totalInvestment: "Sum of Investment.investmentAmount",
        brokerPay: "Sum of BrokerPayment.paidAmount",
        customerPay: "Sum of CustomerPayment.paidAmount (principal+interest)",
        realProfit: "Sum of CustomerPayment.interestPart - Sum of BrokerPayment.paidAmount",
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
