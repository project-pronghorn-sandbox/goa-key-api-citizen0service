/**
 * Comment Controller
 * Handles HTTP requests for comment operations.
 */

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { serviceRequestRepository } from "../repositories/service-request-repository.js";
import { createError } from "../middleware/error-handler.js";
import { createCommentSchema } from "../validators/request-validators.js";

/**
 * Add a comment to a service request.
 * POST /api/requests/:requestId/comments
 */
export async function addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const requestId = req.params.requestId as string;

    // Check if request exists and user has access
    const isStaffOrAdmin = req.user.roles.includes("staff") || req.user.roles.includes("admin");
    
    let request;
    if (isStaffOrAdmin) {
      request = await serviceRequestRepository.getById(requestId);
    } else {
      request = await serviceRequestRepository.getByIdForCitizen(requestId, req.user.sub);
    }

    if (!request) {
      return next(createError("Request not found", 404));
    }

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    // Determine author role
    let authorRole: "citizen" | "staff" | "admin" = "citizen";
    if (req.user.roles.includes("admin")) {
      authorRole = "admin";
    } else if (req.user.roles.includes("staff")) {
      authorRole = "staff";
    }

    const comment = await serviceRequestRepository.addComment(
      requestId,
      req.user.sub,
      authorRole,
      parsed.data.content
    );

    // Create notification for the request owner (if commenter is not the owner)
    if (req.user.sub !== request.citizenId) {
      await serviceRequestRepository.createNotification(
        request.citizenId,
        "new-comment",
        `New comment on your request "${request.title}"`,
        request.id
      );
    }

    // If citizen comments, notify assigned staff
    if (authorRole === "citizen" && request.assignedTo) {
      await serviceRequestRepository.createNotification(
        request.assignedTo,
        "new-comment",
        `Citizen commented on request "${request.title}"`,
        request.id
      );
    }

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

/**
 * Get comments for a service request.
 * GET /api/requests/:requestId/comments
 */
export async function getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const requestId = req.params.requestId as string;

    // Check if request exists and user has access
    const isStaffOrAdmin = req.user.roles.includes("staff") || req.user.roles.includes("admin");
    
    let request;
    if (isStaffOrAdmin) {
      request = await serviceRequestRepository.getById(requestId);
    } else {
      request = await serviceRequestRepository.getByIdForCitizen(requestId, req.user.sub);
    }

    if (!request) {
      return next(createError("Request not found", 404));
    }

    const comments = await serviceRequestRepository.getComments(requestId);

    res.json(comments);
  } catch (error) {
    next(error);
  }
}
