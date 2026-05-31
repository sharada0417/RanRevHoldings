import mongoose from "mongoose";
import Asset from "../infastructure/schemas/asset.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const validateAssetPayload = ({
  assetName,
  assetType,
  vehicleNumber,
  landAddress,
  estimateAmount,
  customerId,
  brokerId,
}) => {
  if (
    !assetName ||
    !assetType ||
    estimateAmount === undefined ||
    estimateAmount === null
  ) {
    return "assetName, assetType, estimateAmount are required";
  }

  if (!["vehicle", "land", "other"].includes(assetType)) {
    return "assetType must be vehicle, land, or other";
  }

  const amount = Number(estimateAmount);

  if (Number.isNaN(amount) || amount < 0) {
    return "estimateAmount must be a valid number and >= 0";
  }

  if (assetType === "vehicle") {
    if (!vehicleNumber || String(vehicleNumber).trim().length < 3) {
      return "vehicleNumber is required when assetType is vehicle";
    }
  }

  if (assetType === "land") {
    if (!landAddress || String(landAddress).trim().length < 5) {
      return "landAddress is required when assetType is land";
    }
  }

  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    return "Invalid customerId";
  }

  if (brokerId && !mongoose.Types.ObjectId.isValid(brokerId)) {
    return "Invalid brokerId";
  }

  return null;
};

export const createAsset = async (req, res) => {
  try {
    const {
      customerId,
      brokerId,
      assetName,
      assetType,
      vehicleNumber,
      landAddress,
      estimateAmount,
      assetDescription,
    } = req.body || {};

    const error = validateAssetPayload({
      customerId,
      brokerId,
      assetName,
      assetType,
      vehicleNumber,
      landAddress,
      estimateAmount,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const created = await Asset.create({
      customerId: customerId || null,
      brokerId: brokerId || null,
      assetName: String(assetName).trim(),
      assetType,
      vehicleNumber:
        assetType === "vehicle"
          ? String(vehicleNumber).trim().toUpperCase()
          : "",
      landAddress: assetType === "land" ? String(landAddress).trim() : "",
      estimateAmount: Number(estimateAmount),
      assetDescription: assetDescription
        ? String(assetDescription).trim()
        : "",
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: created,
    });
  } catch (err) {
    console.error("createAsset error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate("customerId", "name nic tpNumber")
      .populate("brokerId", "name nic tpNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: assets,
    });
  } catch (err) {
    console.error("getAllAssets error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    const asset = await Asset.findById(id)
      .populate("customerId", "name nic tpNumber")
      .populate("brokerId", "name nic tpNumber");

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    console.error("getAssetById error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const next = {
      customerId:
        req.body.customerId !== undefined
          ? req.body.customerId
          : asset.customerId,
      brokerId:
        req.body.brokerId !== undefined
          ? req.body.brokerId
          : asset.brokerId,
      assetName:
        req.body.assetName !== undefined
          ? req.body.assetName
          : asset.assetName,
      assetType:
        req.body.assetType !== undefined
          ? req.body.assetType
          : asset.assetType,
      vehicleNumber:
        req.body.vehicleNumber !== undefined
          ? req.body.vehicleNumber
          : asset.vehicleNumber,
      landAddress:
        req.body.landAddress !== undefined
          ? req.body.landAddress
          : asset.landAddress,
      estimateAmount:
        req.body.estimateAmount !== undefined
          ? req.body.estimateAmount
          : asset.estimateAmount,
    };

    const error = validateAssetPayload(next);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    asset.customerId = next.customerId || null;
    asset.brokerId = next.brokerId || null;
    asset.assetName = String(next.assetName).trim();
    asset.assetType = next.assetType;

    asset.vehicleNumber =
      next.assetType === "vehicle"
        ? String(next.vehicleNumber).trim().toUpperCase()
        : "";

    asset.landAddress =
      next.assetType === "land" ? String(next.landAddress).trim() : "";

    asset.estimateAmount = Number(next.estimateAmount);

    if (req.body.assetDescription !== undefined) {
      asset.assetDescription = String(req.body.assetDescription).trim();
    }

    const updated = await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateAsset error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteAssetById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    const deleted = await Asset.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("deleteAssetById error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAssetFlow = async (req, res) => {
  try {
    const now = new Date();

    const flow = await Asset.aggregate([
      {
        $lookup: {
          from: "investments",
          let: {
            assetId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$$assetId", { $ifNull: ["$assetIds", []] }],
                },
              },
            },
            {
              $sort: {
                startDate: -1,
                createdAt: -1,
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "investment",
        },
      },
      {
        $unwind: {
          path: "$investment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          flowCustomerId: {
            $ifNull: ["$investment.customerId", "$customerId"],
          },
          flowBrokerId: {
            $ifNull: ["$investment.brokerId", "$brokerId"],
          },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "flowCustomerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "brokers",
          localField: "flowBrokerId",
          foreignField: "_id",
          as: "broker",
        },
      },
      {
        $unwind: {
          path: "$broker",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "customerpayments",
          let: {
            investmentId: "$investment._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$investmentId", "$$investmentId"],
                },
              },
            },
            {
              $group: {
                _id: "$investmentId",
                totalCustomerPaid: {
                  $sum: "$paidAmount",
                },
                lastCustomerPaymentDate: {
                  $max: "$paidAt",
                },
              },
            },
          ],
          as: "customerPaySummary",
        },
      },
      {
        $unwind: {
          path: "$customerPaySummary",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "brokerpayments",
          let: {
            investmentId: "$investment._id",
          },
          pipeline: [
            {
              $unwind: {
                path: "$allocations",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$allocations.investmentId", "$$investmentId"],
                },
              },
            },
            {
              $group: {
                _id: "$allocations.investmentId",
                brokerTotalPaidAmount: {
                  $sum: "$allocations.amount",
                },
                brokerLastPaymentDate: {
                  $max: "$paidAt",
                },
              },
            },
          ],
          as: "brokerPaySummary",
        },
      },
      {
        $unwind: {
          path: "$brokerPaySummary",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          investmentAmount: {
            $ifNull: ["$investment.investmentAmount", 0],
          },
          totalCustomerPaid: {
            $ifNull: [
              "$customerPaySummary.totalCustomerPaid",
              {
                $ifNull: ["$investment.totalPaidAmount", 0],
              },
            ],
          },
          brokerTotalPaidAmount: {
            $ifNull: [
              "$brokerPaySummary.brokerTotalPaidAmount",
              {
                $ifNull: ["$investment.brokerTotalPaidAmount", 0],
              },
            ],
          },
          lastPaymentDate: {
            $ifNull: [
              "$customerPaySummary.lastCustomerPaymentDate",
              "$investment.lastPaymentDate",
            ],
          },
          investmentStartDate: {
            $ifNull: ["$investment.startDate", "$createdAt"],
          },
        },
      },
      {
        $addFields: {
          pendingPayment: {
            $cond: [
              {
                $ne: ["$investment.remainingPendingAmount", null],
              },
              {
                $ifNull: ["$investment.remainingPendingAmount", 0],
              },
              {
                $max: [
                  {
                    $subtract: [
                      "$investmentAmount",
                      "$totalCustomerPaid",
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          arrearsBaseDate: {
            $ifNull: ["$lastPaymentDate", "$investmentStartDate"],
          },
        },
      },
      {
        $addFields: {
          daysSinceLastPayment: {
            $cond: [
              {
                $lte: ["$pendingPayment", 0],
              },
              0,
              {
                $floor: {
                  $divide: [
                    {
                      $subtract: [now, "$arrearsBaseDate"],
                    },
                    ONE_DAY_MS,
                  ],
                },
              },
            ],
          },
        },
      },
      {
        $addFields: {
          arrearsMonthGroup: {
            $switch: {
              branches: [
                {
                  case: {
                    $lte: ["$pendingPayment", 0],
                  },
                  then: "finished",
                },
                {
                  case: {
                    $lte: ["$daysSinceLastPayment", 30],
                  },
                  then: "1",
                },
                {
                  case: {
                    $lte: ["$daysSinceLastPayment", 60],
                  },
                  then: "2",
                },
                {
                  case: {
                    $lte: ["$daysSinceLastPayment", 90],
                  },
                  then: "3",
                },
              ],
              default: "more3",
            },
          },
        },
      },
      {
        $addFields: {
          paymentStatus: {
            $cond: [
              {
                $lte: ["$pendingPayment", 0],
              },
              "finished",
              {
                $cond: [
                  {
                    $gt: ["$daysSinceLastPayment", 30],
                  },
                  "arrears",
                  "pending",
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          assetName: 1,
          assetType: 1,
          vehicleNumber: 1,
          landAddress: 1,
          estimateAmount: 1,
          createdAt: 1,

          customer: {
            _id: "$customer._id",
            nic: "$customer.nic",
            name: "$customer.name",
            tpNumber: "$customer.tpNumber",
          },

          broker: {
            _id: "$broker._id",
            nic: "$broker.nic",
            name: "$broker.name",
            tpNumber: "$broker.tpNumber",
          },

          investmentId: "$investment._id",
          investmentName: "$investment.investmentName",
          investmentStartDate: 1,
          investmentAmount: 1,

          totalCustomerPaid: 1,
          pendingPayment: 1,
          lastPaymentDate: 1,
          daysSinceLastPayment: 1,
          arrearsMonthGroup: 1,

          brokerTotalPaidAmount: 1,

          paymentStatus: 1,
        },
      },
      {
        $sort: {
          investmentStartDate: -1,
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: flow,
    });
  } catch (err) {
    console.error("getAssetFlow error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};