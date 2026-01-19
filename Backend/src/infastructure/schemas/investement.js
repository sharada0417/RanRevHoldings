import mongoose from "mongoose";

const InvestmentSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "Broker", required: true },

    investmentAmount: { type: Number, required: true, min: 0 },
    investmentDurationMonths: { type: Number, required: true, min: 1 },

    investmentInterestRate: { type: Number, required: true, min: 0 }, // percent
    brokerCommissionRate: { type: Number, required: true, min: 0 }, // percent

    description: { type: String, trim: true, default: "" },

    // CUSTOMER PAYMENTS
    totalPaidAmount: { type: Number, default: 0, min: 0 },
    remainingPendingAmount: { type: Number, default: null, min: 0 },
    lastPaymentAmount: { type: Number, default: 0, min: 0 },
    lastPaymentDate: { type: Date, default: null },

    // ✅ BROKER PAYMENTS
    brokerTotalPaidAmount: { type: Number, default: 0, min: 0 },
    brokerRemainingPendingAmount: { type: Number, default: null, min: 0 },
    brokerLastPaymentAmount: { type: Number, default: 0, min: 0 },
    brokerLastPaymentDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Investment =
  mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);

export default Investment;
