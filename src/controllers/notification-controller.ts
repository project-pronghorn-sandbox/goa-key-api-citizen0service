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
    
    // Use atomic check-and-update to prevent race conditions
    const updated = await serviceRequestRepository.markNotificationReadForUser(id, req.user.sub);

    if (!updated) {
      return next(createError("Notification not found", 404));
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}
