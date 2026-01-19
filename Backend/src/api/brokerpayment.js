import express from "express";
import {
  getBrokerPaymentSummaryByNic,
  createBrokerPayment,
  getBrokerPaymentHistoryByNic,
} from "../application/brokerpayment.js";

const brokerPaymentRouter = express.Router();

brokerPaymentRouter.get("/broker/:nic/summary", getBrokerPaymentSummaryByNic);
brokerPaymentRouter.post("/pay", createBrokerPayment);
brokerPaymentRouter.get("/broker/:nic/history", getBrokerPaymentHistoryByNic);

export default brokerPaymentRouter;
