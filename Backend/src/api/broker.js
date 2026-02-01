import express from "express";
import {
  getAllBrokers,
  searchBrokers,
  getBrokerById,
  createBroker,
  updateBrokerById,
  deleteBrokerById,
} from "../application/broker.js";

const brokerRouter = express.Router();

brokerRouter.route("/").get(getAllBrokers).post(createBroker);

// ✅ IMPORTANT: /search before /:id
brokerRouter.get("/search", searchBrokers);

brokerRouter
  .route("/:id")
  .get(getBrokerById)
  .put(updateBrokerById)
  .delete(deleteBrokerById);

export default brokerRouter;
