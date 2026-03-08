/**
 * Notification Controller
 * Handles HTTP requests for notification operations.
 */

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { serviceRequestRepository } from "../repositories/service-request-repository.js";
import { createError } from "../middleware/error-handler.js";

/**
 * Get notifications for the authenticated user.
 * GET /api/notifications
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const notifications = await serviceRequestRepository.getNotifications(req.user.sub);

    res.json(notifications);
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a notification as read.
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const id = req.params.id as string;
    
    // First check if the notification exists and belongs to the user
    const notifications = await serviceRequestRepository.getNotifications(req.user.sub);
    const notification = notifications.find((n) => n.id === id);

    if (!notification) {
      return next(createError("Notification not found", 404));
    }

    const updated = await serviceRequestRepository.markNotificationRead(id);

    res.json(updated);
  } catch (error) {
    next(error);
  }
}
