/**
 * Attachment Controller
 * Handles HTTP requests for attachment operations.
 */

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { serviceRequestRepository } from "../repositories/service-request-repository.js";
import { createError } from "../middleware/error-handler.js";
import { attachmentSchema } from "../validators/request-validators.js";

/**
 * Upload an attachment to a service request.
 * POST /api/requests/:requestId/attachments
 */
export async function uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    const parsed = attachmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    // In production, this would upload to Azure Blob Storage
    // For now, we just record the metadata
    const blobUrl = `https://storage.blob.core.windows.net/attachments/${requestId}/${parsed.data.filename}`;

    const attachment = await serviceRequestRepository.addAttachment(
      requestId,
      req.user.sub,
      parsed.data.filename,
      parsed.data.contentType,
      parsed.data.size,
      blobUrl
    );

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
}

/**
 * Get attachments for a service request.
 * GET /api/requests/:requestId/attachments
 */
export async function getAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    const attachments = await serviceRequestRepository.getAttachments(requestId);

    res.json(attachments);
  } catch (error) {
    next(error);
  }
}
