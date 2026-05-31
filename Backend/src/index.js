// backend/server.js  (MODIFIED - added notificationRouter)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./infastructure/db.js";

import dashboardRouter from "./api/dashboard.js";
import brokerRouter from "./api/broker.js";
import customerRoute from "./api/customer.js";
import assetRouter from "./api/asset.js";
import investmentRouter from "./api/investement.js";
import reportRouter from "./api/cutomerReport.js";
import customerpaymentRouter from "./api/Cutomerpayment.js";
import brokerpaymentRouter from "./api/brokerpayment.js";
import customerPaymentHistoryRouter from "./api/customerPaymentHistory.js";
import brokerPaymentHistoryRouter from "./api/brokerpaymentHistory.js";
import userRouter from "./api/user.js";
import notificationRouter from "./api/notification.js"; // ✅ NEW

dotenv.config();

const app = express();

/* =======================
   ✅ CORS – LAN Friendly
======================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.8.107:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

/* =======================
   ✅ Database
======================= */
connectDB();

/* =======================
   ✅ Routes
======================= */
app.use("/api/user", userRouter);
app.use("/api/dashboard", dashboardRouter);

app.use("/api/customer/payments", customerpaymentRouter);
app.use("/api/customer/payments", customerPaymentHistoryRouter);

app.use("/api/broker/payments", brokerpaymentRouter);
app.use("/api/broker/payments", brokerPaymentHistoryRouter);

app.use("/api/reports", reportRouter);
app.use("/api/customer", customerRoute);
app.use("/api/broker", brokerRouter);
app.use("/api/assets", assetRouter);
app.use("/api/investment", investmentRouter);
app.use("/api/notifications", notificationRouter); // ✅ NEW

/* =======================
   ✅ Test Route
======================= */
app.get("/", (req, res) => {
  res.send("🚀 Loan Service API running");
});

/* =======================
   ✅ IMPORTANT PART
   Listen on ALL interfaces
======================= */
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on:`);
  console.log(`👉 Local   : http://localhost:${PORT}`);
  console.log(`👉 Network : http://192.168.8.107:${PORT}`);
});