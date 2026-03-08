/**
 * Authorization middleware for role-based access control (RBAC).
 * Checks if authenticated user has required role(s) to access resources.
 */

import type { Response, NextFunction } from "express";
import { createError } from "./error-handler.js";
import type { AuthenticatedRequest } from "./auth.js";

export type Role = "citizen" | "staff" | "admin";

/**
 * Middleware factory that requires user to have at least one of the specified roles.
 */
export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError("Authentication required", 401));
      return;
    }

    const userRoles = req.user.roles;
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      next(createError("Insufficient permissions", 403));
      return;
    }

    next();
  };
}

/**
 * Middleware factory that requires user to have all of the specified roles.
 */
export function requireAllRoles(...requiredRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError("Authentication required", 401));
      return;
    }

    const userRoles = req.user.roles;
    const hasAllRoles = requiredRoles.every((role) => userRoles.includes(role));

    if (!hasAllRoles) {
      next(createError("Insufficient permissions", 403));
      return;
    }

    next();
  };
}

/**
 * Middleware that allows citizen to access only their own resources.
 * Staff and admin can access any resource.
 */
export function requireOwnerOrStaff(getOwnerId: (req: AuthenticatedRequest) => string | undefined) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError("Authentication required", 401));
      return;
    }

    const userRoles = req.user.roles;

    // Staff and admin can access any resource
    if (userRoles.includes("staff") || userRoles.includes("admin")) {
      next();
      return;
    }

    // Citizens can only access their own resources
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      next(createError("Resource not found", 404));
      return;
    }

    if (req.user.sub !== ownerId) {
      next(createError("Access denied", 403));
      return;
    }

    next();
  };
}

/**
 * Middleware that requires citizen role - blocks staff-only endpoints.
 */
export const requireCitizen = requireRoles("citizen");

/**
 * Middleware that requires staff role - blocks citizen-only endpoints.
 */
export const requireStaff = requireRoles("staff", "admin");

/**
 * Middleware that requires admin role only.
 */
export const requireAdmin = requireRoles("admin");

/**
 * Check if user has a specific role.
 */
export function hasRole(user: AuthenticatedRequest["user"], role: Role): boolean {
  return user?.roles.includes(role) ?? false;
}

/**
 * Check if user is the owner of a resource or is staff/admin.
 */
export function isOwnerOrStaff(user: AuthenticatedRequest["user"], ownerId: string): boolean {
  if (!user) return false;
  if (user.roles.includes("staff") || user.roles.includes("admin")) return true;
  return user.sub === ownerId;
}
