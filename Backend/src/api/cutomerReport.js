// api/cutomerReport.js
import express from "express";
import {
  getCustomerInvestmentReport,
  getCustomerInvestmentReportByNic,
  getAllInvestmentReports,
} from "../application/cutomerReport.js";

const reportRouter = express.Router();

// ✅ all customers summary
// GET /api/reports?page=1&limit=20&q=...
reportRouter.get("/", getAllInvestmentReports);

// ✅ single customer by id
reportRouter.get("/customer/:customerId", getCustomerInvestmentReport);

// ✅ single customer by NIC
reportRouter.get("/customer-nic/:nic", getCustomerInvestmentReportByNic);

export default reportRouter;
