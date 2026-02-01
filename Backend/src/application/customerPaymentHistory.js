import CustomerPayment from "../infastructure/schemas/Cutomerpayment.js";

export const getCustomerPayHistory = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const baseMatch = q
      ? {
          $or: [
            { note: { $regex: q, $options: "i" } },
            { payFor: { $regex: q, $options: "i" } },
            { paymentType: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const rows = await CustomerPayment.aggregate([
      { $match: baseMatch },

      { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "brokers", localField: "brokerId", foreignField: "_id", as: "broker" } },
      { $unwind: { path: "$broker", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "investments", localField: "investmentId", foreignField: "_id", as: "investment" } },
      { $unwind: { path: "$investment", preserveNullAndEmptyArrays: true } },

      ...(q
        ? [
            {
              $match: {
                $or: [
                  { "customer.nic": { $regex: q, $options: "i" } },
                  { "customer.name": { $regex: q, $options: "i" } },
                  { "broker.nic": { $regex: q, $options: "i" } },
                  { "broker.name": { $regex: q, $options: "i" } },
                  { "investment.investmentName": { $regex: q, $options: "i" } },
                  { note: { $regex: q, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      {
        $project: {
          _id: 1,
          paidAt: 1,

          paymentMethod: "$paymentType",
          payFor: 1,
          paidAmount: 1,

          // ✅ REMOVED: totalInterestPaidAfter (user asked)
          // totalInterestPaidAfter: 1,

          // keep principal totals if you still want them in future
          totalPrincipalPaidAfter: 1,
          isPrincipalFullyPaidAfter: 1,

          note: 1,

          customer: { nic: "$customer.nic", name: "$customer.name" },
          broker: { nic: "$broker.nic", name: "$broker.name" },
          investment: { investmentName: "$investment.investmentName" },
        },
      },

      { $sort: { paidAt: -1 } },
      { $limit: 2000 },
    ]);

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getCustomerPayHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
