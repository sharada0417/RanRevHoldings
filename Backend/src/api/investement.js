import express from "express";
import {
  createInvestment,
  getAllInvestments,
  getInvestmentById,
  updateInvestment,
  deleteInvestment,
} from "../application/investement.js";

const investmentRouter = express.Router();

investmentRouter.route("/").post(createInvestment).get(getAllInvestments);

investmentRouter
  .route("/:id")
  .get(getInvestmentById)
  .put(updateInvestment)
  .delete(deleteInvestment);

export default investmentRouter;
