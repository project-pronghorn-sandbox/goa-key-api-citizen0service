/**
 * Service Request Controller
 * Handles HTTP requests for service request operations.
 */

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { serviceRequestRepository } from "../repositories/service-request-repository.js";
import { createError } from "../middleware/error-handler.js";
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
  updateStatusSchema,
  listRequestsQuerySchema,
} from "../validators/request-validators.js";

/**
 * Create a new service request.
 * POST /api/requests
 */
export async function createRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const parsed = createServiceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    const request = await serviceRequestRepository.create({
      citizenId: req.user.sub,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
}

/**
 * List service requests.
 * Citizens see only their own requests; staff/admin see all.
 * GET /api/requests
 */
export async function listRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const parsed = listRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    const isCitizen = req.user.roles.includes("citizen") && !req.user.roles.includes("staff") && !req.user.roles.includes("admin");
    
    const result = await serviceRequestRepository.list({
      page: parsed.data.page,
      limit: parsed.data.limit,
      status: parsed.data.status,
      priority: parsed.data.priority,
      citizenId: isCitizen ? req.user.sub : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get a service request by ID.
 * Citizens can only see their own requests.
 * GET /api/requests/:id
 */
export async function getRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const id = req.params.id as string;
    const isStaffOrAdmin = req.user.roles.includes("staff") || req.user.roles.includes("admin");

    let request;
    if (isStaffOrAdmin) {
      request = await serviceRequestRepository.getById(id);
    } else {
      request = await serviceRequestRepository.getByIdForCitizen(id, req.user.sub);
    }

    if (!request) {
      return next(createError("Request not found", 404));
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a service request.
 * Citizens can only update their own requests (limited fields).
 * PATCH /api/requests/:id
 */
export async function updateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const id = req.params.id as string;
    const parsed = updateServiceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    const isStaffOrAdmin = req.user.roles.includes("staff") || req.user.roles.includes("admin");

    let request;
    if (isStaffOrAdmin) {
      request = await serviceRequestRepository.update(id, parsed.data);
    } else {
      // Citizens can only update title and description, not priority
      const { title, description } = parsed.data;
      request = await serviceRequestRepository.updateForCitizen(id, req.user.sub, {
        title,
        description,
      });
    }

    if (!request) {
      return next(createError("Request not found", 404));
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
}

/**
 * Update service request status.
 * Staff/admin only.
 * PATCH /api/requests/:id/status
 */
export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const isStaffOrAdmin = req.user.roles.includes("staff") || req.user.roles.includes("admin");
    if (!isStaffOrAdmin) {
      return next(createError("Insufficient permissions", 403));
    }

    const id = req.params.id as string;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.issues[0].message, 400));
    }

    const request = await serviceRequestRepository.update(id, {
      status: parsed.data.status,
    });

    if (!request) {
      return next(createError("Request not found", 404));
    }

    // Create notification for the citizen
    await serviceRequestRepository.createNotification(
      request.citizenId,
      "status-change",
      `Your request "${request.title}" status changed to ${parsed.data.status}`,
      request.id
    );

    res.json(request);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a service request.
 * Admin only.
 * DELETE /api/requests/:id
 */
export async function deleteRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    const isAdmin = req.user.roles.includes("admin");
    if (!isAdmin) {
      return next(createError("Insufficient permissions", 403));
    }

    const id = req.params.id as string;
    const deleted = await serviceRequestRepository.delete(id);

    if (!deleted) {
      return next(createError("Request not found", 404));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
