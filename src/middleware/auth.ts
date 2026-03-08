/**
 * Authentication middleware for validating JWT tokens.
 * In production, this validates tokens against Azure AD B2C or Entra ID.
 * For testing, tokens are validated by decoding and checking claims.
 * 
 * SECURITY NOTE: This implementation decodes JWTs without cryptographic verification.
 * TODO: PRODUCTION - Implement JWT signature verification with Azure AD/Entra ID keys.
 * See: https://learn.microsoft.com/en-us/azure/active-directory/develop/access-tokens
 */

import type { Request, Response, NextFunction } from "express";
import { createError } from "./error-handler.js";
import { logger } from "../lib/logger.js";

export interface AuthenticatedUser {
  sub: string;
  name: string;
  email: string;
  roles: string[];
  oid?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Decode a JWT token and extract claims.
 * 
 * IMPORTANT: This is a simplified implementation for testing purposes.
 * In production, tokens MUST be cryptographically verified using:
 * - Azure AD JWKS endpoint for signature verification
 * - Issuer and audience validation
 * - Token expiration checking
 * 
 * TODO: Use @azure/msal-node or passport-azure-ad for production
 */
function decodeToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const claims = JSON.parse(payload);

    // Check required claims
    if (!claims.sub || !claims.roles || !Array.isArray(claims.roles)) {
      return null;
    }

    // Check token expiration
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: claims.sub,
      name: claims.name || "",
      email: claims.email || "",
      roles: claims.roles,
      oid: claims.oid,
    };
  } catch {
    return null;
  }
}

/**
 * Authentication middleware.
 * Validates the Authorization header and attaches user to request.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn("Missing authorization header");
    next(createError("Authentication required", 401));
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Invalid authorization header format");
    next(createError("Invalid authorization header", 401));
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    logger.warn("Empty token");
    next(createError("Invalid token", 401));
    return;
  }

  const user = decodeToken(token);

  if (!user) {
    logger.warn("Failed to decode token");
    next(createError("Invalid or expired token", 401));
    return;
  }

  req.user = user;
  next();
}

/**
 * Optional authentication - attaches user if token present but doesn't require it.
 */
export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const user = decodeToken(token);

  if (user) {
    req.user = user;
  }

  next();
}
