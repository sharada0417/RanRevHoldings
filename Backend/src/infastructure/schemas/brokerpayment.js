import mongoose from "mongoose";

const BrokerPaymentSchema = new mongoose.Schema(
  {
    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
      required: true,
    },

    paidAmount: { type: Number, required: true, min: 0.01 },

    // ✅ allocation across investments
    allocations: [
      {
        investmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Investment",
          required: true,
        },
        amount: { type: Number, required: true, min: 0.01 },
      },
    ],

    note: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const BrokerPayment =
  mongoose.models.BrokerPayment ||
  mongoose.model("BrokerPayment", BrokerPaymentSchema);

export default BrokerPayment;
