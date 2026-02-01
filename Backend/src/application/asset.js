import mongoose from "mongoose";
import Asset from "../infastructure/schemas/asset.js";

const validateAssetPayload = ({
  assetName,
  assetType,
  vehicleNumber,
  landAddress,
  estimateAmount,
  customerId,
  brokerId,
}) => {
  if (!assetName || !assetType || estimateAmount === undefined || estimateAmount === null) {
    return "assetName, assetType, estimateAmount are required";
  }

  if (!["vehicle", "land", "other"].includes(assetType)) {
    return "assetType must be vehicle, land, or other";
  }

  const amt = Number(estimateAmount);
  if (Number.isNaN(amt) || amt < 0) return "estimateAmount must be a valid number and >= 0";

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

  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) return "Invalid customerId";
  if (brokerId && !mongoose.Types.ObjectId.isValid(brokerId)) return "Invalid brokerId";

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
    if (error) return res.status(400).json({ success: false, message: error });

    const created = await Asset.create({
      customerId: customerId || null,
      brokerId: brokerId || null,
      assetName: String(assetName).trim(),
      assetType,
      vehicleNumber: assetType === "vehicle" ? String(vehicleNumber).trim().toUpperCase() : "",
      landAddress: assetType === "land" ? String(landAddress).trim() : "",
      estimateAmount: Number(estimateAmount),
      assetDescription: assetDescription ? String(assetDescription).trim() : "",
      // ✅ createdAt comes automatically from timestamps
    });

    return res
      .status(201)
      .json({ success: true, message: "Asset created successfully", data: created });
  } catch (err) {
    console.error("createAsset error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate("customerId", "name nic tpNumber")
      .populate("brokerId", "name nic tpNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: assets });
  } catch (err) {
    console.error("getAllAssets error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid asset id" });

    const asset = await Asset.findById(id)
      .populate("customerId", "name nic tpNumber")
      .populate("brokerId", "name nic tpNumber");

    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
    return res.status(200).json({ success: true, data: asset });
  } catch (err) {
    console.error("getAssetById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid asset id" });

    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    const next = {
      customerId: req.body.customerId !== undefined ? req.body.customerId : asset.customerId,
      brokerId: req.body.brokerId !== undefined ? req.body.brokerId : asset.brokerId,
      assetName: req.body.assetName !== undefined ? req.body.assetName : asset.assetName,
      assetType: req.body.assetType !== undefined ? req.body.assetType : asset.assetType,
      vehicleNumber: req.body.vehicleNumber !== undefined ? req.body.vehicleNumber : asset.vehicleNumber,
      landAddress: req.body.landAddress !== undefined ? req.body.landAddress : asset.landAddress,
      estimateAmount: req.body.estimateAmount !== undefined ? req.body.estimateAmount : asset.estimateAmount,
    };

    const error = validateAssetPayload(next);
    if (error) return res.status(400).json({ success: false, message: error });

    asset.customerId = next.customerId || null;
    asset.brokerId = next.brokerId || null;
    asset.assetName = String(next.assetName).trim();
    asset.assetType = next.assetType;

    asset.vehicleNumber =
      next.assetType === "vehicle" ? String(next.vehicleNumber).trim().toUpperCase() : "";
    asset.landAddress = next.assetType === "land" ? String(next.landAddress).trim() : "";
    asset.estimateAmount = Number(next.estimateAmount);

    if (req.body.assetDescription !== undefined) {
      asset.assetDescription = String(req.body.assetDescription).trim();
    }

    const updated = await asset.save();
    return res.status(200).json({ success: true, message: "Asset updated successfully", data: updated });
  } catch (err) {
    console.error("updateAsset error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid asset id" });

    const deleted = await Asset.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Asset not found" });

    return res.status(200).json({ success: true, message: "Asset deleted successfully", data: deleted });
  } catch (err) {
    console.error("deleteAssetById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ Asset Flow (unchanged logic)
 * ✅ Removed assetDate, now expose createdAt only
 */
export const getAssetFlow = async (req, res) => {
  try {
    const arrearsDays = Number(req.query.arrearsDays || 30);
    const arrearsMs = arrearsDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    const flow = await Asset.aggregate([
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brokers",
          localField: "brokerId",
          foreignField: "_id",
          as: "broker",
        },
      },
      { $unwind: { path: "$broker", preserveNullAndEmptyArrays: true } },

      {
        // inside getAssetFlow pipeline, REPLACE this lookup:

  $lookup: {
    from: "investments",
    let: { assetId: "$_id" },
    pipeline: [
      {
        $match: {
          $expr: { $in: ["$$assetId", "$assetIds"] }, // ✅ FIX
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ],
    as: "investment",
  },
},

      { $unwind: { path: "$investment", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "customerpayments",
          let: { invId: "$investment._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$investmentId", "$$invId"] } } },
            { $group: { _id: "$investmentId", totalCustomerPaid: { $sum: "$paidAmount" } } },
          ],
          as: "customerPaySum",
        },
      },
      { $unwind: { path: "$customerPaySum", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brokerpayments",
          let: { invId: "$investment._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$investmentId", "$$invId"] } } },
            { $group: { _id: "$investmentId", brokerTotalPaidAmount: { $sum: "$paidAmount" } } },
          ],
          as: "brokerPaySum",
        },
      },
      { $unwind: { path: "$brokerPaySum", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          investmentAmount: { $ifNull: ["$investment.investmentAmount", 0] },
          totalCustomerPaid: { $ifNull: ["$customerPaySum.totalCustomerPaid", 0] },
          brokerTotalPaidAmount: { $ifNull: ["$brokerPaySum.brokerTotalPaidAmount", 0] },
          lastPaymentDate: { $ifNull: ["$investment.lastPaymentDate", null] },
          pendingPayment: {
            $cond: [
              { $ne: ["$investment.remainingPendingAmount", null] },
              { $ifNull: ["$investment.remainingPendingAmount", 0] },
              {
                $max: [
                  {
                    $subtract: [
                      { $ifNull: ["$investment.investmentAmount", 0] },
                      { $ifNull: ["$customerPaySum.totalCustomerPaid", 0] },
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
          isFinished: { $lte: ["$pendingPayment", 0] },
          isArrears: {
            $and: [
              { $gt: ["$pendingPayment", 0] },
              {
                $or: [
                  { $eq: ["$lastPaymentDate", null] },
                  { $gt: [{ $subtract: [now, "$lastPaymentDate"] }, arrearsMs] },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          paymentStatus: {
            $cond: ["$isFinished", "finished", { $cond: ["$isArrears", "arrears", "pending"] }],
          },
        },
      },

      {
        $project: {
          _id: 1,
          assetName: 1,
          estimateAmount: 1,

          customer: { _id: "$customer._id", nic: "$customer.nic", name: "$customer.name" },
          broker: { _id: "$broker._id", nic: "$broker.nic", name: "$broker.name" },

          investmentId: "$investment._id",
          investmentAmount: 1,
          totalCustomerPaid: 1,
          pendingPayment: 1,
          brokerTotalPaidAmount: 1,

          paymentStatus: 1,
          createdAt: 1, // ✅ only created date
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ success: true, data: flow });
  } catch (err) {
    console.error("getAssetFlow error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
