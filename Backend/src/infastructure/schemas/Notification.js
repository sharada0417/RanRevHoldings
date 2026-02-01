import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ARREARS"],
      required: true,
      default: "ARREARS",
    },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "Broker", required: false, default: null },

    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Investment", required: true },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // for quick navigation
    customerNic: { type: String, default: "" },

    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
