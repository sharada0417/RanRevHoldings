// backend/api/notification.js

import express from "express";
import { getNotifications } from "../application/notification.js";

const notificationRouter = express.Router();

// GET /api/notifications
notificationRouter.get("/", getNotifications);

export default notificationRouter;