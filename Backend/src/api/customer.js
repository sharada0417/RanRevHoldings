import express from "express";
import {
  getAllCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomerById,
} from "../application/customer.js";

const customerRouter = express.Router();

customerRouter.route("/").get(getAllCustomers).post(createCustomer);

// ✅ IMPORTANT: /search must be BEFORE /:id
customerRouter.get("/search", searchCustomers);

customerRouter
  .route("/:id")
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(deleteCustomerById);

export default customerRouter;
