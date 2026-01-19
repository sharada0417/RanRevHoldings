import express from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAssetById,
  getAssetFlow, // ✅ NEW
} from "../application/asset.js";

const assetRouter = express.Router();

// ✅ NEW FLOW ROUTE (must be before "/:id")
assetRouter.get("/flow", getAssetFlow);

assetRouter
  .route("/")
  .get(getAllAssets)
  .post(createAsset);

assetRouter
  .route("/:id")
  .get(getAssetById)
  .put(updateAsset)
  .delete(deleteAssetById);

export default assetRouter;
