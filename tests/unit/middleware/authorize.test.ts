import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import {
  requireRoles,
  requireAllRoles,
  requireOwnerOrStaff,
  requireCitizen,
  requireStaff,
  requireAdmin,
  hasRole,
  isOwnerOrStaff,
} from "../../../src/middleware/authorize.js";
import type { AuthenticatedRequest } from "../../../src/middleware/auth.js";
import { getMockUser } from "../../helpers/mock-auth.js";

describe("Authorize Middleware", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe("requireRoles", () => {
    it("should allow user with required role", () => {
      mockReq.user = getMockUser("citizen");
      const middleware = requireRoles("citizen");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow user with one of multiple allowed roles", () => {
      mockReq.user = getMockUser("staff");
      const middleware = requireRoles("citizen", "staff");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny user without required role", () => {
      mockReq.user = getMockUser("citizen");
      const middleware = requireRoles("staff");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });

    it("should deny unauthenticated user", () => {
      mockReq.user = undefined;
      const middleware = requireRoles("citizen");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        })
      );
    });
  });

  describe("requireAllRoles", () => {
    it("should allow user with all required roles", () => {
      mockReq.user = getMockUser("admin"); // admin has both admin and staff roles
      const middleware = requireAllRoles("admin", "staff");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny user missing one required role", () => {
      mockReq.user = getMockUser("staff");
      const middleware = requireAllRoles("admin", "staff");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });

    it("should deny unauthenticated user", () => {
      mockReq.user = undefined;
      const middleware = requireAllRoles("citizen");

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        })
      );
    });
  });

  describe("requireOwnerOrStaff", () => {
    const getOwnerIdFromReq = (req: AuthenticatedRequest) => req.params?.ownerId;

    it("should allow owner to access their own resource", () => {
      mockReq.user = getMockUser("citizen");
      mockReq.params = { ownerId: "citizen-001" };
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow staff to access any resource", () => {
      mockReq.user = getMockUser("staff");
      mockReq.params = { ownerId: "citizen-001" };
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow admin to access any resource", () => {
      mockReq.user = getMockUser("admin");
      mockReq.params = { ownerId: "citizen-001" };
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny citizen access to another citizen's resource", () => {
      mockReq.user = getMockUser("citizen");
      mockReq.params = { ownerId: "citizen-002" }; // Different owner
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Access denied",
          statusCode: 403,
        })
      );
    });

    it("should return 404 when resource owner cannot be determined", () => {
      mockReq.user = getMockUser("citizen");
      mockReq.params = {}; // No ownerId
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Resource not found",
          statusCode: 404,
        })
      );
    });

    it("should deny unauthenticated user", () => {
      mockReq.user = undefined;
      mockReq.params = { ownerId: "citizen-001" };
      const middleware = requireOwnerOrStaff(getOwnerIdFromReq);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        })
      );
    });
  });

  describe("requireCitizen", () => {
    it("should allow citizen", () => {
      mockReq.user = getMockUser("citizen");

      requireCitizen(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny staff", () => {
      mockReq.user = getMockUser("staff");

      requireCitizen(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });
  });

  describe("requireStaff", () => {
    it("should allow staff", () => {
      mockReq.user = getMockUser("staff");

      requireStaff(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow admin", () => {
      mockReq.user = getMockUser("admin");

      requireStaff(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny citizen", () => {
      mockReq.user = getMockUser("citizen");

      requireStaff(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });
  });

  describe("requireAdmin", () => {
    it("should allow admin", () => {
      mockReq.user = getMockUser("admin");

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should deny staff", () => {
      mockReq.user = getMockUser("staff");

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });

    it("should deny citizen", () => {
      mockReq.user = getMockUser("citizen");

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient permissions",
          statusCode: 403,
        })
      );
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the role", () => {
      const user = getMockUser("admin");
      expect(hasRole(user, "admin")).toBe(true);
      expect(hasRole(user, "staff")).toBe(true);
    });

    it("should return false when user does not have the role", () => {
      const user = getMockUser("citizen");
      expect(hasRole(user, "admin")).toBe(false);
    });

    it("should return false for undefined user", () => {
      expect(hasRole(undefined, "admin")).toBe(false);
    });
  });

  describe("isOwnerOrStaff", () => {
    it("should return true when user is owner", () => {
      const user = getMockUser("citizen");
      expect(isOwnerOrStaff(user, "citizen-001")).toBe(true);
    });

    it("should return true when user is staff", () => {
      const user = getMockUser("staff");
      expect(isOwnerOrStaff(user, "citizen-001")).toBe(true);
    });

    it("should return true when user is admin", () => {
      const user = getMockUser("admin");
      expect(isOwnerOrStaff(user, "citizen-001")).toBe(true);
    });

    it("should return false when citizen is not owner", () => {
      const user = getMockUser("citizen");
      expect(isOwnerOrStaff(user, "citizen-002")).toBe(false);
    });

    it("should return false for undefined user", () => {
      expect(isOwnerOrStaff(undefined, "citizen-001")).toBe(false);
    });
  });
});
