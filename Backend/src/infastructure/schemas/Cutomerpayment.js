import mongoose from "mongoose";

const CustomerPaymentSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "Broker", required: true },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Investment", required: true },

    // ✅ CHANGED: investment can have multiple assets
    assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true }],

    paymentType: { type: String, enum: ["cash", "check"], required: true },

    payFor: {
      type: String,
      enum: ["interest", "interest+principal", "principal"],
      required: true,
      default: "interest",
    },

    paidAmount: { type: Number, required: true, min: 0.01 },

    interestPart: { type: Number, default: 0, min: 0 },
    principalPart: { type: Number, default: 0, min: 0 },

    excessAmount: { type: Number, default: 0, min: 0 },

    totalInterestPaidAfter: { type: Number, default: 0, min: 0 },
    totalPrincipalPaidAfter: { type: Number, default: 0, min: 0 },

    isPrincipalFullyPaidAfter: { type: Boolean, default: false },

    note: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CustomerPayment =
  mongoose.models.CustomerPayment ||
  mongoose.model("CustomerPayment", CustomerPaymentSchema);

export default CustomerPayment;
