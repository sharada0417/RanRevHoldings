import mongoose from "mongoose";
import Customer from "../infastructure/schemas/customer.js";

/**
 * Sri Lanka NIC formats supported:
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

/**
 * Accept:
 *  - 94xxxxxxxxx (11 digits)
 *  - 0xxxxxxxxx  (10 digits)
 * Normalize => 94xxxxxxxxx
 */
const normalizeSriLankaMobile = (tpRaw) => {
  let tp = String(tpRaw || "").trim();
  tp = tp.replace(/[\s\-+]/g, "");

  if (/^0\d{9}$/.test(tp)) tp = "94" + tp.slice(1);
  if (!/^94\d{9}$/.test(tp)) return null;

  return tp;
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: customers });
  } catch (err) {
    console.error("getAllCustomers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ SEARCH by NIC OR NAME (OR logic) - NIC optional
export const searchCustomers = async (req, res) => {
  try {
    const { nic, name } = req.query || {};

    if (!nic && !name) {
      return res.status(400).json({
        success: false,
        message:
          "Provide nic or name. Example: /api/customer/search?nic=200110801867 or ?name=naveed",
      });
    }

    const orConditions = [];

    if (nic) {
      orConditions.push({
        nic: { $regex: String(nic).trim().toUpperCase(), $options: "i" },
      });
    }

    if (name) {
      orConditions.push({
        name: { $regex: String(name).trim(), $options: "i" },
      });
    }

    const customers = await Customer.find({ $or: orConditions }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("searchCustomers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer id" });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    console.error("getCustomerById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { nic, name, address, city, tpNumber } = req.body || {};

    // ✅ nic NOT required now
    if (!name || !address || !city || !tpNumber) {
      return res.status(400).json({
        success: false,
        message: "name, address, city, tpNumber are required",
      });
    }

    // ✅ validate nic only if provided (non-empty)
    const nicTrim = String(nic || "").trim();
    let normalizedNic = null;

    if (nicTrim) {
      if (!isValidSriLankaNIC(nicTrim)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid NIC. Supported: 12 digits OR 11 digits + V/X (example: 94674433786V) (also accepts 9 digits + V/X).",
        });
      }
      normalizedNic = nicTrim.toUpperCase();

      const nicExists = await Customer.findOne({ nic: normalizedNic });
      if (nicExists) {
        return res
          .status(409)
          .json({ success: false, message: "Customer already exists with this NIC" });
      }
    }

    const normalizedTp = normalizeSriLankaMobile(tpNumber);
    if (!normalizedTp) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid mobile. Use 94xxxxxxxxx (94765556575) or 0xxxxxxxxx (0765556575).",
      });
    }

    const phoneExists = await Customer.findOne({ tpNumber: normalizedTp });
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with this phone number",
      });
    }

    const created = await Customer.create({
      nic: normalizedNic, // ✅ null if not provided
      name: String(name).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      tpNumber: normalizedTp,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: created,
    });
  } catch (err) {
    console.error("createCustomer error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate value (NIC or phone already exists)",
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { nic, name, address, city, tpNumber } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer id" });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // ✅ NIC optional update (allow clearing NIC too)
    if (nic !== undefined) {
      const nicTrim = String(nic || "").trim();

      if (!nicTrim) {
        // user cleared NIC
        customer.nic = null;
      } else {
        if (!isValidSriLankaNIC(nicTrim)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid NIC. Supported: 12 digits OR 11 digits + V/X (also accepts 9 digits + V/X).",
          });
        }

        const normalizedNic = nicTrim.toUpperCase();

        const nicExists = await Customer.findOne({
          nic: normalizedNic,
          _id: { $ne: id },
        });

        if (nicExists) {
          return res.status(409).json({
            success: false,
            message: "Another customer already uses this NIC",
          });
        }

        customer.nic = normalizedNic;
      }
    }

    if (tpNumber !== undefined) {
      const normalizedTp = normalizeSriLankaMobile(tpNumber);
      if (!normalizedTp) {
        return res.status(400).json({
          success: false,
          message: "Invalid mobile. Use 94xxxxxxxxx or 0xxxxxxxxx.",
        });
      }

      const phoneExists = await Customer.findOne({
        tpNumber: normalizedTp,
        _id: { $ne: id },
      });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message: "Another customer already uses this phone number",
        });
      }

      customer.tpNumber = normalizedTp;
    }

    if (name !== undefined) customer.name = String(name).trim();
    if (address !== undefined) customer.address = String(address).trim();
    if (city !== undefined) customer.city = String(city).trim();

    const updated = await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateCustomer error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate value (NIC or phone already exists)",
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer id" });
    }

    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("deleteCustomerById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
