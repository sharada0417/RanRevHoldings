import mongoose from "mongoose";

const BrokerPaymentSchema = new mongoose.Schema(
  {
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "Broker", required: true },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Investment", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },

    paidAmount: { type: Number, required: true, min: 0.01 },

    // snapshots
    investmentAmount: { type: Number, required: true, min: 0 },
    brokerCommissionRate: { type: Number, required: true, min: 0 },
    brokerCommissionTotal: { type: Number, required: true, min: 0 },

    payableUnlocked: { type: Boolean, required: true }, // customer paid interest?
    pendingBefore: { type: Number, required: true, min: 0 },
    pendingAfter: { type: Number, required: true, min: 0 },

    note: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const BrokerPayment =
  mongoose.models.BrokerPayment || mongoose.model("BrokerPayment", BrokerPaymentSchema);

export default BrokerPayment;
