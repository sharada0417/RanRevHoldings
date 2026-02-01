import express from "express";
import { getBrokerPaymentHistoryTable } from "../application/brokerpaymentHistory.js";

const brokerPaymentHistoryRouter = express.Router();

// GET /api/broker/payments/history?search=
brokerPaymentHistoryRouter.get("/history", getBrokerPaymentHistoryTable);

export default brokerPaymentHistoryRouter;
