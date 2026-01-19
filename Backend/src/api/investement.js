import express from "express";
import {
  createInvestment,
  getAllInvestments,
  getInvestmentById,
} from "../application/investement.js";

const investmentRouter = express.Router();

investmentRouter
  .route("/")
  .post(createInvestment)
  .get(getAllInvestments);

investmentRouter
  .route("/:id")
  .get(getInvestmentById);

export default investmentRouter;
