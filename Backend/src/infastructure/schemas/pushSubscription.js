import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    platform: { type: String, default: "web" },
  },
  { timestamps: true }
);

const PushSubscription =
  mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);

export default PushSubscription;
