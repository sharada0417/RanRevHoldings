// backend/api/brokerpayment.js  (MODIFIED — added by-id summary route)

import express from "express";
import {
  getBrokerSummaryByNic,
  getBrokerSummaryById,        // ✅ NEW import
  createBrokerSimplePayment,
} from "../application/brokerpayment.js";

const brokerpaymentRouter = express.Router();

// ✅ summary by NIC
brokerpaymentRouter.get("/broker/:nic/summary", getBrokerSummaryByNic);

// ✅ NEW: summary by MongoDB _id (for brokers without a NIC)
brokerpaymentRouter.get("/broker/id/:id/summary", getBrokerSummaryById);

// ✅ simple pay
brokerpaymentRouter.post("/pay", createBrokerSimplePayment);

export default brokerpaymentRouter;