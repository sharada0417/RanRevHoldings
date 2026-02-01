import express from "express";
import {
  getBrokerSummaryByNic,
  createBrokerSimplePayment,
} from "../application/brokerpayment.js";

const brokerpaymentRouter = express.Router();

// ✅ summary
brokerpaymentRouter.get("/broker/:nic/summary", getBrokerSummaryByNic);

// ✅ simple pay
brokerpaymentRouter.post("/pay", createBrokerSimplePayment);

export default brokerpaymentRouter;
