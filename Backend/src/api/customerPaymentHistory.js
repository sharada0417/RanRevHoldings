import express from "express";
import { getCustomerPayHistory } from "../application/customerPaymentHistory.js";

const customerPaymentHistoryRouter = express.Router();

customerPaymentHistoryRouter.get("/history", getCustomerPayHistory);

export default customerPaymentHistoryRouter;
