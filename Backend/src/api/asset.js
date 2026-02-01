import express from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAssetById,
  getAssetFlow,
} from "../application/asset.js";

const assetRouter = express.Router();

// ✅ flow first
assetRouter.get("/flow", getAssetFlow);

// ✅ list + create
assetRouter.route("/").get(getAllAssets).post(createAsset);

// ✅ single
assetRouter.route("/:id").get(getAssetById).put(updateAsset).delete(deleteAssetById);

export default assetRouter;
