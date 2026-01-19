// application/cutomerReport.js
import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";

/**
 * ✅ Correct Formula (percent-based):
 * pending = investmentAmount + (investmentAmount * (investmentInterestRate / 100))
 * monthly = pending / 12
 */

// ✅ Single customer report by customerId
export const getCustomerInvestmentReport = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: "Invalid customerId" });
    }

    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const pipeline = [
      { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },

      // ✅ pending = investmentAmount + investmentAmount*(rate/100)
      {
        $addFields: {
          customerPendlingpayment: {
            $add: [
              "$investmentAmount",
              {
                $multiply: [
                  "$investmentAmount",
                  { $divide: ["$investmentInterestRate", 100] },
                ],
              },
            ],
          },
        },
      },

      // ✅ monthly = pending / 12
      {
        $addFields: {
          monthlyPaymentAmount: { $divide: ["$customerPendlingpayment", 12] },
        },
      },

      {
        $facet: {
          totals: [
            {
              $group: {
                _id: "$customerId",
                totalInvestmentAmount: { $sum: "$investmentAmount" },
                totalCustomerPendlingpayment: { $sum: "$customerPendlingpayment" },
                totalMonthlyPaymentAmount: { $sum: "$monthlyPaymentAmount" },
                investmentsCount: { $sum: 1 },
              },
            },
          ],

          investments: [
            { $sort: { createdAt: -1 } },
            {
              $project: {
                _id: 1,
                customerId: 1,
                brokerId: 1,
                assetId: 1,
                investmentAmount: 1,
                investmentInterestRate: 1,
                investmentDurationMonths: 1,
                customerPendlingpayment: 1,
                monthlyPaymentAmount: 1,
                brokerCommissionRate: 1,
                description: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await Investment.aggregate(pipeline);

    const totals = result?.[0]?.totals?.[0] || {
      totalInvestmentAmount: 0,
      totalCustomerPendlingpayment: 0,
      totalMonthlyPaymentAmount: 0,
      investmentsCount: 0,
    };

    return res.status(200).json({
      success: true,
      customer,
      totals,
      investments: result?.[0]?.investments || [],
      formulaUsed: {
        pending: "investmentAmount + (investmentAmount * (investmentInterestRate/100))",
        monthly: "pending / 12",
        example: "10000 + 10000*(2.5/100) = 10250; monthly = 10250/12 = 854.17",
      },
    });
  } catch (err) {
    console.error("getCustomerInvestmentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Single customer report by NIC
export const getCustomerInvestmentReportByNic = async (req, res) => {
  try {
    const { nic } = req.params;
    const normalizedNic = String(nic || "").trim().toUpperCase();

    const customer = await Customer.findOne({ nic: normalizedNic }).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found for this NIC" });
    }

    req.params.customerId = String(customer._id);
    return getCustomerInvestmentReport(req, res);
  } catch (err) {
    console.error("getCustomerInvestmentReportByNic error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ ALL customers report (summary)
export const getAllInvestmentReports = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matchCustomer =
      q.trim().length > 0
        ? {
            $or: [
              { nic: { $regex: q, $options: "i" } },
              { name: { $regex: q, $options: "i" } },
              { tpNumber: { $regex: q, $options: "i" } },
            ],
          }
        : {};

    const pipeline = [
      { $match: matchCustomer },

      // Join investments
      {
        $lookup: {
          from: "investments", // must match actual collection name
          localField: "_id",
          foreignField: "customerId",
          as: "investments",
        },
      },

      { $unwind: { path: "$investments", preserveNullAndEmptyArrays: true } },

      // safe values
      {
        $addFields: {
          invAmount: { $ifNull: ["$investments.investmentAmount", 0] },
          invRate: { $ifNull: ["$investments.investmentInterestRate", 0] },
        },
      },

      // ✅ invPending = amount + amount*(rate/100)
      {
        $addFields: {
          invPending: {
            $add: [
              "$invAmount",
              { $multiply: ["$invAmount", { $divide: ["$invRate", 100] }] },
            ],
          },
        },
      },

      // ✅ invMonthly = invPending/12
      { $addFields: { invMonthly: { $divide: ["$invPending", 12] } } },

      // group per customer
      {
        $group: {
          _id: "$_id",
          customer: { $first: "$$ROOT" },
          totalInvestmentAmount: { $sum: "$invAmount" },
          totalCustomerPendlingpayment: { $sum: "$invPending" },
          totalMonthlyPaymentAmount: { $sum: "$invMonthly" },
          investmentsCount: {
            $sum: { $cond: [{ $gt: ["$invAmount", 0] }, 1, 0] },
          },
        },
      },

      {
        $project: {
          _id: 0,
          customerId: "$_id",
          customer: {
            nic: "$customer.nic",
            name: "$customer.name",
            tpNumber: "$customer.tpNumber",
            city: "$customer.city",
            address: "$customer.address",
            createdAt: "$customer.createdAt",
          },
          totalInvestmentAmount: 1,
          totalCustomerPendlingpayment: 1,
          totalMonthlyPaymentAmount: 1,
          investmentsCount: 1,
        },
      },

      { $sort: { totalInvestmentAmount: -1 } },

      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: Number(limit) }],
        },
      },
    ];

    const result = await Customer.aggregate(pipeline);
    const total = result?.[0]?.meta?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      data: result?.[0]?.data || [],
      formulaUsed: {
        pending: "investmentAmount + (investmentAmount * (investmentInterestRate/100))",
        monthly: "pending / 12",
      },
    });
  } catch (err) {
    console.error("getAllInvestmentReports error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
