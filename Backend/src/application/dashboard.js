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
       ✅ 1) TOTAL INVESTMENT AMOUNT
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
          customerPay     = FULL paidAmount (principal + interest)
          customerInterest = ONLY interestPart (total interest received)
          ownerInterest    = interestPart × (ownerRate / totalRate)
                           = interestPart × ((totalRate - brokerRate) / totalRate)
       ========================================================= */
    const customerPayAgg = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: start, $lt: end } } },
      {
        $lookup: {
          from: "investments",
          localField: "investmentId",
          foreignField: "_id",
          as: "investment",
        },
      },
      { $unwind: { path: "$investment", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalRate: { $ifNull: ["$investment.investmentInterestRate", 0] },
          brokerRate: { $ifNull: ["$investment.brokerCommissionRate", 0] },
        },
      },
      {
        $addFields: {
          ownerRate: { $subtract: ["$totalRate", "$brokerRate"] },
          // ownerInterestPart = interestPart × (ownerRate / totalRate)
          // Guard against totalRate = 0 to avoid division by zero
          ownerInterestPart: {
            $cond: [
              { $gt: ["$totalRate", 0] },
              {
                $multiply: [
                  { $ifNull: ["$interestPart", 0] },
                  { $divide: [{ $subtract: ["$totalRate", "$brokerRate"] }, "$totalRate"] },
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: groupKeyBy(granularity, "$paidAt"),
          totalCustomerPay: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalCustomerInterest: { $sum: { $ifNull: ["$interestPart", 0] } },
          totalOwnerInterest: { $sum: "$ownerInterestPart" },
        },
      },
    ]);

    /* =========================================================
       ✅ 3) BROKER PAYMENTS (Commission We Paid Out)
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
       ✅ SERIES
       ========================================================= */
    const series = {
      investment: Array(labels.length).fill(0),
      customerPay: Array(labels.length).fill(0),       // Full customer payment (principal + interest)
      customerInterest: Array(labels.length).fill(0),  // Total interest portion
      ownerInterest: Array(labels.length).fill(0),     // Owner's share of interest
      brokerPay: Array(labels.length).fill(0),         // Broker commission paid out

      // ✅ REAL PROFIT = ownerInterest received (not commission paid yet — that's brokerPay)
      // Owner profit = what owner earned from interest receipts
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
        series.ownerInterest[idx] = Number(row.totalOwnerInterest || 0);
      }
    }

    for (const row of brokerPayAgg) {
      const idx = indexFromGroup({ granularity, year, _id: row._id });
      if (idx >= 0 && idx < labels.length) {
        series.brokerPay[idx] = Number(row.totalBrokerPay || 0);
      }
    }

    // ✅ Real profit = owner's interest earned in that period
    // (brokerPay is already separated — when you pay broker, it's NOT profit loss
    //  because broker commission is carved out of the rate, not paid separately from profit)
    for (let i = 0; i < labels.length; i++) {
      series.realProfit[i] = Number(series.ownerInterest[i] || 0);
    }

    /* =========================================================
       ✅ TOTALS
       ========================================================= */
    const totals = {
      totalInvestment: series.investment.reduce((a, b) => a + b, 0),
      totalBrokerPay: series.brokerPay.reduce((a, b) => a + b, 0),
      totalCustomerPay: series.customerPay.reduce((a, b) => a + b, 0),
      totalCustomerInterest: series.customerInterest.reduce((a, b) => a + b, 0),
      totalOwnerInterest: series.ownerInterest.reduce((a, b) => a + b, 0),
      totalRealProfit: series.realProfit.reduce((a, b) => a + b, 0),
    };

    /* =========================================================
       ✅ Monthly Review
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
        $lookup: {
          from: "investments",
          localField: "investmentId",
          foreignField: "_id",
          as: "investment",
        },
      },
      { $unwind: { path: "$investment", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalRate: { $ifNull: ["$investment.investmentInterestRate", 0] },
          brokerRate: { $ifNull: ["$investment.brokerCommissionRate", 0] },
          ownerInterestPart: {
            $cond: [
              { $gt: [{ $ifNull: ["$investment.investmentInterestRate", 0] }, 0] },
              {
                $multiply: [
                  { $ifNull: ["$interestPart", 0] },
                  {
                    $divide: [
                      { $subtract: [
                        { $ifNull: ["$investment.investmentInterestRate", 0] },
                        { $ifNull: ["$investment.brokerCommissionRate", 0] },
                      ]},
                      { $ifNull: ["$investment.investmentInterestRate", 0] },
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCustomerPayThisMonth: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalCustomerInterestThisMonth: { $sum: { $ifNull: ["$interestPart", 0] } },
          totalOwnerInterestThisMonth: { $sum: "$ownerInterestPart" },
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
    const ownerInterestThisMonth = Number(monthlyCustomerPay?.totalOwnerInterestThisMonth || 0);
    const brokerPayThisMonth = Number(monthlyBrokerPay?.totalBrokerPayThisMonth || 0);

    const review = {
      monthLabel: monthNamesShort[month - 1],
      customerPayThisMonth,            // Full customer payment (principal + interest)
      brokerPayThisMonth,              // Commission paid out to broker this month
      customerInterestThisMonth,       // Total interest received this month
      ownerInterestThisMonth,          // Owner's share of interest received
      realProfitThisMonth: ownerInterestThisMonth, // Owner's actual profit from interest
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
        interestSplit:
          "brokerCommissionRate is carved out of investmentInterestRate. " +
          "ownerInterest = interestPart × (ownerRate / totalRate). " +
          "realProfit = ownerInterest received (broker commission is a separate split, not deducted from profit).",
        totalInvestment: "Sum of Investment.investmentAmount in period",
        brokerPay: "Sum of BrokerPayment.paidAmount in period (actual cash paid to broker)",
        customerPay: "Sum of CustomerPayment.paidAmount (principal+interest)",
        ownerInterest: "Interest portion earned by owner (after broker rate split)",
        realProfit: "= ownerInterest (owner's share of interest collected)",
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};