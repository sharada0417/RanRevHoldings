import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
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

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default Customer;
