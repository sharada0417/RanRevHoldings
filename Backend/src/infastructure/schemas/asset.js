import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },

    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
      required: false,
      default: null,
    },

    assetName: { type: String, required: true, trim: true },

    assetType: {
      type: String,
      enum: ["vehicle", "land", "other"],
      required: true,
    },

    vehicleNumber: { type: String, trim: true, uppercase: true, default: "" },
    landAddress: { type: String, trim: true, default: "" },

    estimateAmount: { type: Number, required: true, min: 0 },

    assetDescription: { type: String, trim: true, default: "" },

    // ✅ NEW: release asset after full settlement
    isReleased: { type: Boolean, default: false },
    releasedAt: { type: Date, default: null },
    releaseNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const Asset = mongoose.models.Asset || mongoose.model("Asset", AssetSchema);
export default Asset;
