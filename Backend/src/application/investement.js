import mongoose from "mongoose";
import Investment from "../infastructure/schemas/investement.js";
import Customer from "../infastructure/schemas/customer.js";
import Broker from "../infastructure/schemas/broker.js";
import Asset from "../infastructure/schemas/asset.js";

/**
 * NIC formats supported:
 *  - 12 digits: 200110801867
 *  - 11 digits + V/X: 94674433786V
 *  - 9 digits + V/X: 123456789V
 */
const isValidSriLankaNIC = (nicRaw) => {
  const nic = String(nicRaw || "").trim();
  const re12 = /^\d{12}$/;
  const re11vx = /^\d{11}[VvXx]$/;
  const re9vx = /^\d{9}[VvXx]$/;
  return re12.test(nic) || re11vx.test(nic) || re9vx.test(nic);
};

export const createInvestment = async (req, res) => {
  try {
    const {
      customerNic,
      brokerNic,
      assetId,
      investmentAmount,
      investmentDurationMonths,
      investmentInterestRate, // ✅ NEW
      brokerCommissionRate,
      description,
    } = req.body || {};

    // Required fields
    if (
      !customerNic ||
      !brokerNic ||
      !assetId ||
      investmentAmount === undefined ||
      investmentDurationMonths === undefined ||
      investmentInterestRate === undefined || // ✅ NEW required
      brokerCommissionRate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customerNic, brokerNic, assetId, investmentAmount, investmentDurationMonths, investmentInterestRate, brokerCommissionRate are required",
      });
    }

    // NIC validations
    if (!isValidSriLankaNIC(customerNic)) {
      return res.status(400).json({ success: false, message: "Invalid customerNic format" });
    }
    if (!isValidSriLankaNIC(brokerNic)) {
      return res.status(400).json({ success: false, message: "Invalid brokerNic format" });
    }

    // assetId validation
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ success: false, message: "Invalid assetId" });
    }

    const invAmt = Number(investmentAmount);
    if (Number.isNaN(invAmt) || invAmt < 0) {
      return res.status(400).json({
        success: false,
        message: "investmentAmount must be a valid number and >= 0",
      });
    }

    const duration = Number(investmentDurationMonths);
    if (Number.isNaN(duration) || duration < 1) {
      return res.status(400).json({
        success: false,
        message: "investmentDurationMonths must be >= 1",
      });
    }

    // ✅ NEW: interest rate validation (percent)
    const intRate = Number(investmentInterestRate);
    if (Number.isNaN(intRate) || intRate < 0) {
      return res.status(400).json({
        success: false,
        message: "investmentInterestRate must be a valid number and >= 0",
      });
    }

    const commRate = Number(brokerCommissionRate);
    if (Number.isNaN(commRate) || commRate < 0) {
      return res.status(400).json({
        success: false,
        message: "brokerCommissionRate must be a valid number and >= 0",
      });
    }

    // Find customer by NIC
    const normalizedCustomerNic = String(customerNic).trim().toUpperCase();
    const customer = await Customer.findOne({ nic: normalizedCustomerNic });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found for this NIC" });
    }

    // Find broker by NIC
    const normalizedBrokerNic = String(brokerNic).trim().toUpperCase();
    const broker = await Broker.findOne({ nic: normalizedBrokerNic });
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found for this NIC" });
    }

    // Find asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    // Ensure asset belongs to that customer (if asset has customerId)
    if (asset.customerId && String(asset.customerId) !== String(customer._id)) {
      return res.status(400).json({
        success: false,
        message: "This asset does not belong to the provided customer",
      });
    }

    // Create investment
    const created = await Investment.create({
      customerId: customer._id,
      brokerId: broker._id,
      assetId: asset._id,
      investmentAmount: invAmt,
      investmentDurationMonths: duration,
      investmentInterestRate: intRate, // ✅ NEW saved
      brokerCommissionRate: commRate,
      description: description ? String(description).trim() : "",
    });

    // Return populated
    const populated = await Investment.findById(created._id)
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetId",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress"
      );

    return res.status(201).json({
      success: true,
      message: "Investment created successfully",
      data: populated,
    });
  } catch (err) {
    console.error("createInvestment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllInvestments = async (req, res) => {
  try {
    const investments = await Investment.find()
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetId",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: investments });
  } catch (err) {
    console.error("getAllInvestments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getInvestmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid investment id" });
    }

    const investment = await Investment.findById(id)
      .populate("customerId", "nic name")
      .populate("brokerId", "nic name")
      .populate(
        "assetId",
        "assetType assetDescription estimateAmount assetName vehicleNumber landAddress"
      );

    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    return res.status(200).json({ success: true, data: investment });
  } catch (err) {
    console.error("getInvestmentById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
