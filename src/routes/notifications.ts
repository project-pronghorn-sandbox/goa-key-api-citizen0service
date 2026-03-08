/**
 * Notification Routes
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getNotifications, markAsRead } from "../controllers/notification-controller.js";

export const notificationRouter = Router();

// All routes require authentication
notificationRouter.use(authenticate);

// Notification routes
notificationRouter.get("/", getNotifications);
notificationRouter.patch("/:id/read", markAsRead);
