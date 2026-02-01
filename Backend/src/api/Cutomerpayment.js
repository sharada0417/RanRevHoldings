import express from "express";
import {
  createCustomerPayment,
  getCustomerInvestmentsByNic,
  getCustomerFlow,
  getCustomerFlowByNic,
} from "../application/Cutomerpayment.js";

const paymentRouter = express.Router();

// ✅ customer flow
paymentRouter.get("/customer/flow", getCustomerFlow);
paymentRouter.get("/customer/:nic/flow", getCustomerFlowByNic);

// ✅ existing
paymentRouter.get("/customer/:nic/investments", getCustomerInvestmentsByNic);
paymentRouter.post("/pay", createCustomerPayment);

export default paymentRouter;
