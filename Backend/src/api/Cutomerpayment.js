import express from "express";
import {
  createCustomerPayment,
  getInvestmentFullPaymentReport,
  getCustomerAssetFullPaymentReport,

  // ✅ added (flow)
  getCustomerFlowList,
  getCustomerFlowByNic,
} from "../application/Cutomerpayment.js";

const paymentRouter = express.Router();

// ✅ added (flow)
paymentRouter.get("/customer/flow", getCustomerFlowList);
paymentRouter.get("/customer/:nic/flow", getCustomerFlowByNic);

// ✅ existing
paymentRouter.post("/pay", createCustomerPayment);
paymentRouter.get("/investment/:investmentId/full", getInvestmentFullPaymentReport);
paymentRouter.get("/customer/:nic/asset/:assetId/full", getCustomerAssetFullPaymentReport);

export default paymentRouter;
