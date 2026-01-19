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


// ✅ add this
import userRouter from "./api/user.js";

dotenv.config();
const app = express();

// ✅ CORS (front-end URL update if needed)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Connect DB
connectDB();

// ✅ USER ROUTES
app.use("/api/user", userRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/customer/payments", customerpaymentRouter);
app.use("/api/broker/payments", brokerpaymentRouter);
app.use("/api/customer/payments", customerPaymentHistoryRouter);
app.use("/api/broker/payments", brokerPaymentHistoryRouter);

app.use("/api/reports", reportRouter);
app.use("/api/customer", customerRoute);
app.use("/api/broker", brokerRouter);
app.use("/api/assets", assetRouter);
app.use("/api/investment", investmentRouter);

app.get("/", (req, res) => {
  res.send("Loan Service API running");
});

const PORT =  5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
