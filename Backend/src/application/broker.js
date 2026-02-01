import mongoose from "mongoose";
import Broker from "../infastructure/schemas/broker.js";

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

export const getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: brokers });
  } catch (err) {
    console.error("getAllBrokers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ SEARCH by NIC OR NAME
export const searchBrokers = async (req, res) => {
  try {
    const { nic, name } = req.query || {};

    if (!nic && !name) {
      return res.status(400).json({
        success: false,
        message:
          "Provide nic or name. Example: /api/broker/search?nic=200110801867 or ?name=kamal",
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

    const brokers = await Broker.find({ $or: orConditions }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: brokers.length,
      data: brokers,
    });
  } catch (err) {
    console.error("searchBrokers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getBrokerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid broker id" });
    }

    const broker = await Broker.findById(id);
    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });
    }

    return res.status(200).json({ success: true, data: broker });
  } catch (err) {
    console.error("getBrokerById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createBroker = async (req, res) => {
  try {
    const { nic, name, address, city, tpNumber } = req.body || {};

    // ✅ nic NOT required
    if (!name || !address || !city || !tpNumber) {
      return res.status(400).json({
        success: false,
        message: "name, address, city, tpNumber are required",
      });
    }

    // ✅ validate nic only if provided
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

      const nicExists = await Broker.findOne({ nic: normalizedNic });
      if (nicExists) {
        return res
          .status(409)
          .json({ success: false, message: "Broker already exists with this NIC" });
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

    const phoneExists = await Broker.findOne({ tpNumber: normalizedTp });
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: "Broker already exists with this phone number",
      });
    }

    const created = await Broker.create({
      nic: normalizedNic, // ✅ null if not provided
      name: String(name).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      tpNumber: normalizedTp,
    });

    return res.status(201).json({
      success: true,
      message: "Broker created successfully",
      data: created,
    });
  } catch (err) {
    console.error("createBroker error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate value (NIC or phone already exists)",
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateBrokerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { nic, name, address, city, tpNumber } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid broker id" });
    }

    const broker = await Broker.findById(id);
    if (!broker) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });
    }

    // ✅ NIC optional update (allow clearing)
    if (nic !== undefined) {
      const nicTrim = String(nic || "").trim();

      if (!nicTrim) {
        broker.nic = null; // clear
      } else {
        if (!isValidSriLankaNIC(nicTrim)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid NIC. Supported: 12 digits OR 11 digits + V/X (also accepts 9 digits + V/X).",
          });
        }

        const normalizedNic = nicTrim.toUpperCase();

        const nicExists = await Broker.findOne({
          nic: normalizedNic,
          _id: { $ne: id },
        });

        if (nicExists) {
          return res.status(409).json({
            success: false,
            message: "Another broker already uses this NIC",
          });
        }

        broker.nic = normalizedNic;
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

      const phoneExists = await Broker.findOne({
        tpNumber: normalizedTp,
        _id: { $ne: id },
      });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message: "Another broker already uses this phone number",
        });
      }

      broker.tpNumber = normalizedTp;
    }

    if (name !== undefined) broker.name = String(name).trim();
    if (address !== undefined) broker.address = String(address).trim();
    if (city !== undefined) broker.city = String(city).trim();

    const updated = await broker.save();

    return res.status(200).json({
      success: true,
      message: "Broker updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateBrokerById error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate value (NIC or phone already exists)",
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteBrokerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid broker id" });
    }

    const deleted = await Broker.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Broker deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("deleteBrokerById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
