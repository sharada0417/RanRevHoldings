import mongoose from "mongoose";

const InvestmentSchema = new mongoose.Schema(
  {
    investmentName: { type: String, required: true, trim: true },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // ✅ multiple assets in one investment
    assetIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    ],

    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
      required: true,
    },

    investmentAmount: { type: Number, required: true, min: 0 },

    // monthly interest %
    investmentInterestRate: { type: Number, required: true, min: 0 },

    // broker commission % (on interest PAID)
    brokerCommissionRate: { type: Number, required: true, min: 0 },

    // start of investment
    startDate: { type: Date, required: true },

    description: { type: String, trim: true, default: "" },

    // customer payments
    principalPaidAmount: { type: Number, default: 0, min: 0 },
    interestPaidAmount: { type: Number, default: 0, min: 0 }, // ✅ IMPORTANT for broker unlock
    totalPaidAmount: { type: Number, default: 0, min: 0 },

    remainingPendingAmount: { type: Number, default: null, min: 0 },

    lastPaymentAmount: { type: Number, default: 0, min: 0 },
    lastPaymentDate: { type: Date, default: null },

    /* ===========================
       ✅ Broker payment rollups
       =========================== */

    // total broker commission paid (for this investment)
    brokerTotalPaidAmount: { type: Number, default: 0, min: 0 },

    brokerLastPaymentAmount: { type: Number, default: 0, min: 0 },
    brokerLastPaymentDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Investment =
  mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);

export default Investment;
