// api/dashboard.js
import express from "express";
import { getDashboardSummary } from "../application/dashboard.js";

const dashboardRouter = express.Router();

// GET /api/dashboard/summary?granularity=month&year=2026&month=1
dashboardRouter.get("/summary", getDashboardSummary);

export default dashboardRouter;
