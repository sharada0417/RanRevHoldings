import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";

/**
 * pending = investmentAmount + (investmentAmount * (investmentInterestRate / 100))
 * monthly = pending / 12
 */

// ✅ GET /api/reports/customer/:customerId
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

      {
        $addFields: {
          customerPendlingpayment: {
            $add: [
              "$investmentAmount",
              {
                $multiply: ["$investmentAmount", { $divide: ["$investmentInterestRate", 100] }],
              },
            ],
          },
        },
      },

      { $addFields: { monthlyPaymentAmount: { $divide: ["$customerPendlingpayment", 12] } } },

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
                assetIds: 1,

                investmentName: 1,
                investmentAmount: 1,
                investmentInterestRate: 1,
                brokerCommissionRate: 1,

                customerPendlingpayment: 1,
                monthlyPaymentAmount: 1,

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
        example: "100000 + 100000*(10/100) = 110000; monthly = 110000/12 = 9166.67",
      },
    });
  } catch (err) {
    console.error("getCustomerInvestmentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET /api/reports/customer-nic/:nic
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

// ✅ GET /api/reports?page=1&limit=20&q=...
export const getAllInvestmentReports = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 200);
    const q = String(req.query.q || "").trim();

    const matchCustomer = q
      ? {
          $or: [
            { nic: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
            { city: { $regex: q, $options: "i" } },
            { address: { $regex: q, $options: "i" } },
            { tpNumber: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    // 1) Find matching customers (paged)
    const [customers, totalCustomers] = await Promise.all([
      Customer.find(matchCustomer)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(matchCustomer),
    ]);

    if (!customers.length) {
      return res.status(200).json({
        success: true,
        page,
        limit,
        totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
        data: [],
      });
    }

    const customerIds = customers.map((c) => c._id);

    // 2) Aggregate investments totals by customerId (only for current page customers)
    const invAgg = await Investment.aggregate([
      { $match: { customerId: { $in: customerIds } } },

      {
        $addFields: {
          customerPendlingpayment: {
            $add: [
              "$investmentAmount",
              {
                $multiply: ["$investmentAmount", { $divide: ["$investmentInterestRate", 100] }],
              },
            ],
          },
        },
      },
      { $addFields: { monthlyPaymentAmount: { $divide: ["$customerPendlingpayment", 12] } } },

      {
        $group: {
          _id: "$customerId",
          totalInvestmentAmount: { $sum: "$investmentAmount" },
          totalCustomerPendlingpayment: { $sum: "$customerPendlingpayment" },
          totalMonthlyPaymentAmount: { $sum: "$monthlyPaymentAmount" },
          investmentsCount: { $sum: 1 },
        },
      },
    ]);

    const map = new Map(invAgg.map((x) => [String(x._id), x]));

    // 3) Merge
    const data = customers.map((c) => {
      const t = map.get(String(c._id)) || {
        totalInvestmentAmount: 0,
        totalCustomerPendlingpayment: 0,
        totalMonthlyPaymentAmount: 0,
        investmentsCount: 0,
      };

      return {
        customer: {
          _id: c._id,
          nic: c.nic,
          name: c.name,
          address: c.address,
          city: c.city,
          tpNumber: c.tpNumber,
        },
        totals: {
          totalInvestmentAmount: Number(t.totalInvestmentAmount || 0),
          totalCustomerPendlingpayment: Number(t.totalCustomerPendlingpayment || 0),
          totalMonthlyPaymentAmount: Number(t.totalMonthlyPaymentAmount || 0),
          investmentsCount: Number(t.investmentsCount || 0),
        },
      };
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalCustomers,
      totalPages: Math.ceil(totalCustomers / limit),
      data,
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
