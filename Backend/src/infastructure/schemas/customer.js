import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    nic: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      default: null,
    },

    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },

    tpNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default Customer;
