import mongoose from "mongoose";

const CustomerPaymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
      required: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    // ✅ cash | check
    paymentType: {
      type: String,
      enum: ["cash", "check"],
      required: true,
    },

    paidAmount: { type: Number, required: true, min: 0.01 },

    // snapshot values at time of payment (audit)
    investmentAmount: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, required: true, min: 0 },
    interestAmount: { type: Number, required: true, min: 0 },
    totalPayable: { type: Number, required: true, min: 0 },

    totalPaidBefore: { type: Number, required: true, min: 0 },
    totalPaidAfter: { type: Number, required: true, min: 0 },

    pendingBefore: { type: Number, required: true, min: 0 },
    pendingAfter: { type: Number, required: true, min: 0 },

    note: { type: String, trim: true, default: "" },

    // ✅ date+time
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CustomerPayment =
  mongoose.models.CustomerPayment ||
  mongoose.model("CustomerPayment", CustomerPaymentSchema);

export default CustomerPayment;
