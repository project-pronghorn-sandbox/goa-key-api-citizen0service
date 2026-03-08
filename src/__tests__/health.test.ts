import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// Mock the logger
vi.mock("../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Health Check", () => {
  const app = createApp();

  it("should return ok status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("goa--key-api-citizen0service");
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
  });
});
