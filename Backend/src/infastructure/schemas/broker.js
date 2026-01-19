import mongoose from "mongoose";

const BrokerSchema = new mongoose.Schema(
  {
    nic: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },

    // store as 94xxxxxxxxx
    tpNumber: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

const Broker = mongoose.models.Broker || mongoose.model("Broker", BrokerSchema);

export default Broker;
