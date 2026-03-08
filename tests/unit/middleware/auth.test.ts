import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import { authenticate, optionalAuthenticate, type AuthenticatedRequest } from "../../../src/middleware/auth.js";
import {
  createMockToken,
  createMockTokenForRole,
  createExpiredToken,
  createInvalidToken,
} from "../../helpers/mock-auth.js";

// Mock the logger
vi.mock("../../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Auth Middleware", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    it("should authenticate valid token", () => {
      const token = createMockTokenForRole("citizen");
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.sub).toBe("citizen-001");
      expect(mockReq.user?.roles).toContain("citizen");
    });

    it("should authenticate staff token", () => {
      const token = createMockTokenForRole("staff");
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user?.roles).toContain("staff");
    });

    it("should authenticate admin token", () => {
      const token = createMockTokenForRole("admin");
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user?.roles).toContain("admin");
      expect(mockReq.user?.roles).toContain("staff");
    });

    it("should reject missing authorization header", () => {
      mockReq.headers = {};

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        })
      );
      expect(mockReq.user).toBeUndefined();
    });

    it("should reject invalid authorization header format", () => {
      mockReq.headers = { authorization: "Basic sometoken" };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid authorization header",
          statusCode: 401,
        })
      );
    });

    it("should reject empty token", () => {
      mockReq.headers = { authorization: "Bearer " };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid token",
          statusCode: 401,
        })
      );
    });

    it("should reject expired token", () => {
      const expiredToken = createExpiredToken("citizen");
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          statusCode: 401,
        })
      );
    });

    it("should reject malformed token", () => {
      const invalidToken = createInvalidToken();
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          statusCode: 401,
        })
      );
    });

    it("should reject token missing required claims", () => {
      // Create token without roles
      const payload = Buffer.from(JSON.stringify({ sub: "user-1" })).toString("base64url");
      const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
      const token = `${header}.${payload}.signature`;
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          statusCode: 401,
        })
      );
    });

    it("should reject token with non-array roles", () => {
      const payload = Buffer.from(JSON.stringify({ sub: "user-1", roles: "citizen" })).toString("base64url");
      const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
      const token = `${header}.${payload}.signature`;
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          statusCode: 401,
        })
      );
    });

    it("should preserve custom claims in user object", () => {
      const token = createMockToken({
        sub: "custom-user",
        name: "Custom User",
        email: "custom@test.com",
        roles: ["citizen"],
        oid: "custom-oid",
      });
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user?.oid).toBe("custom-oid");
      expect(mockReq.user?.email).toBe("custom@test.com");
    });
  });

  describe("optionalAuthenticate", () => {
    it("should authenticate valid token", () => {
      const token = createMockTokenForRole("citizen");
      mockReq.headers = { authorization: `Bearer ${token}` };

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.sub).toBe("citizen-001");
    });

    it("should allow missing authorization header", () => {
      mockReq.headers = {};

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it("should allow invalid authorization header format without setting user", () => {
      mockReq.headers = { authorization: "Basic sometoken" };

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it("should continue without user for invalid token", () => {
      const invalidToken = createInvalidToken();
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it("should continue without user for expired token", () => {
      const expiredToken = createExpiredToken("citizen");
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });
  });
});
