import express from "express";
import { getCustomerPaymentHistory } from "../application/customerPaymentHistory.js";

const customerPaymentHistoryRouter = express.Router();

// GET /api/customer/payments/history?q=
customerPaymentHistoryRouter.get("/history", getCustomerPaymentHistory);

export default customerPaymentHistoryRouter;
