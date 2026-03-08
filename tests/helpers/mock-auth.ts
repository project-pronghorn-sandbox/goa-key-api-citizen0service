/**
 * Mock JWT generation for testing authentication and authorization.
 * Generates fake JWTs with customizable claims for testing RBAC.
 */

export interface MockUserClaims {
  sub: string;
  name: string;
  email: string;
  roles: string[];
  oid?: string;
  iat?: number;
  exp?: number;
}

export type UserRole = "citizen" | "staff" | "admin";

const defaultUsers: Record<UserRole, MockUserClaims> = {
  citizen: {
    sub: "citizen-001",
    name: "Test Citizen",
    email: "citizen@test.com",
    roles: ["citizen"],
    oid: "00000000-0000-0000-0000-000000000001",
  },
  staff: {
    sub: "staff-001",
    name: "Test Staff",
    email: "staff@gov.ab.ca",
    roles: ["staff"],
    oid: "00000000-0000-0000-0000-000000000002",
  },
  admin: {
    sub: "admin-001",
    name: "Test Admin",
    email: "admin@gov.ab.ca",
    roles: ["admin", "staff"],
    oid: "00000000-0000-0000-0000-000000000003",
  },
};

/**
 * Create a mock JWT token string.
 * This is a base64-encoded mock token for testing, not a real signed JWT.
 */
export function createMockToken(claims: Partial<MockUserClaims> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const fullClaims: MockUserClaims = {
    ...defaultUsers.citizen,
    ...claims,
    iat: claims.iat ?? now,
    exp: claims.exp ?? now + 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(fullClaims)).toString("base64url");
  const signature = Buffer.from("mock-signature").toString("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Create a mock token for a specific user role.
 */
export function createMockTokenForRole(role: UserRole, overrides: Partial<MockUserClaims> = {}): string {
  return createMockToken({
    ...defaultUsers[role],
    ...overrides,
  });
}

/**
 * Create a mock Authorization header value.
 */
export function createAuthHeader(role: UserRole = "citizen", overrides: Partial<MockUserClaims> = {}): string {
  return `Bearer ${createMockTokenForRole(role, overrides)}`;
}

/**
 * Decode a mock token and extract claims.
 */
export function decodeMockToken(token: string): MockUserClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as MockUserClaims;
  } catch {
    return null;
  }
}

/**
 * Create an expired mock token.
 */
export function createExpiredToken(role: UserRole = "citizen"): string {
  const expired = Math.floor(Date.now() / 1000) - 3600;
  return createMockTokenForRole(role, { exp: expired });
}

/**
 * Create an invalid token (malformed).
 */
export function createInvalidToken(): string {
  return "invalid.token.here";
}

/**
 * Get default mock user data for a role.
 */
export function getMockUser(role: UserRole): MockUserClaims {
  return { ...defaultUsers[role] };
}

/**
 * Create a second citizen user for row-level security testing.
 */
export function createSecondCitizen(): string {
  return createMockToken({
    sub: "citizen-002",
    name: "Second Citizen",
    email: "citizen2@test.com",
    roles: ["citizen"],
    oid: "00000000-0000-0000-0000-000000000004",
  });
}
