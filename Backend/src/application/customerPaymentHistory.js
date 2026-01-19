import Investment from "../infastructure/schemas/investement.js";
import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

const n = (x) => Number(x || 0);

const calcInterestAmount = (investmentAmount, ratePercent) =>
  n(investmentAmount) * (n(ratePercent) / 100);

const calcTotalPayable = (investmentAmount, ratePercent) =>
  n(investmentAmount) + calcInterestAmount(investmentAmount, ratePercent);

const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();

/**
 * months elapsed from investment start month -> current month (inclusive)
 * ex: start Jan, current Jan => 1
 *     start Jan, current Feb => 2
 */
const monthsElapsedInclusive = (startDate, nowDate) => {
  const s = new Date(startDate);
  const e = new Date(nowDate);
  const diff = monthKey(e) - monthKey(s) + 1;
  return Math.max(diff, 0);
};

/**
 * ✅ GET Asset-by-Asset payment history rows (per investment)
 * GET /api/customer/payments/history?q=
 */
export const getCustomerPaymentHistory = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ✅ investments with customer + asset
    const investments = await Investment.find()
      .populate("customerId", "nic name")
      .populate("assetId", "assetName assetType vehicleNumber landAddress estimateAmount")
      .sort({ createdAt: -1 })
      .lean();

    // ✅ this month payments grouped by investmentId (fast, no N+1)
    const thisMonthAgg = await CustomerPayment.aggregate([
      { $match: { paidAt: { $gte: monthStart, $lt: monthEnd } } },
      {
        $group: {
          _id: "$investmentId",
          thisMonthPayment: { $sum: "$paidAmount" },
        },
      },
    ]);

    const thisMonthMap = new Map(
      thisMonthAgg.map((x) => [String(x._id), n(x.thisMonthPayment)])
    );

    const rows = [];

    for (const inv of investments) {
      const customer = inv.customerId || {};
      const asset = inv.assetId || {};

      const investAmount = n(inv.investmentAmount);
      const interestRate = n(inv.investmentInterestRate);
      const duration = Math.max(n(inv.investmentDurationMonths), 0);

      const interestAmount = calcInterestAmount(investAmount, interestRate);
      const totalPayable = calcTotalPayable(investAmount, interestRate);

      const monthlyDue = duration > 0 ? totalPayable / duration : 0;

      const totalPaid = n(inv.totalPaidAmount);
      const pending =
        inv.remainingPendingAmount === null || inv.remainingPendingAmount === undefined
          ? Math.max(totalPayable - totalPaid, 0)
          : n(inv.remainingPendingAmount);

      // ✅ arrears definition (should-have-paid up to end of this month)
      const elapsed = duration > 0
        ? Math.min(monthsElapsedInclusive(inv.createdAt, now), duration)
        : 0;

      const expectedPaidByNow = elapsed * monthlyDue;
      const arrearsAmount = Math.max(expectedPaidByNow - totalPaid, 0);
      const arrearsMonths = monthlyDue > 0 ? Math.ceil(arrearsAmount / monthlyDue) : 0;

      const remainingMonths = monthlyDue > 0 ? Math.ceil(pending / monthlyDue) : 0;

      const thisMonthPayment = thisMonthMap.get(String(inv._id)) || 0;

      const row = {
        investmentId: inv._id,
        investmentDate: inv.createdAt,

        customerName: customer?.name || "-",
        customerNic: customer?.nic || "-",

        assetName: asset?.assetName || "-",
        assetType: asset?.assetType || "-",
        vehicleNumber: asset?.vehicleNumber || "",
        landAddress: asset?.landAddress || "",
        estimateAmount: n(asset?.estimateAmount),

        monthlyDue,
        thisMonthPayment,

        arrearsAmount,
        arrearsMonths,

        totalPaidMoney: totalPaid,
        pendingPayment: pending,
        remainingMonths,
      };

      // ✅ search filter (customer + asset)
      if (q) {
        const hay = [
          row.customerName,
          row.customerNic,
          row.assetName,
          row.assetType,
          row.vehicleNumber,
          row.landAddress,
          row.investmentId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(q)) continue;
      }

      rows.push(row);
    }

    // optional: show biggest arrears first
    rows.sort((a, b) => n(b.arrearsAmount) - n(a.arrearsAmount));

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getCustomerPaymentHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
