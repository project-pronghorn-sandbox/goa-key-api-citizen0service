import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { clearMockDb, createServiceRequest, getMockDb } from "../helpers/mock-db.js";
import { createAuthHeader } from "../helpers/mock-auth.js";

// Mock the logger
vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Attachments Integration Tests", () => {
  const app = createApp();

  beforeEach(() => {
    clearMockDb();
    vi.clearAllMocks();
  });

  describe("POST /api/requests/:requestId/attachments", () => {
    it("should upload an attachment to own request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "document.pdf",
          contentType: "application/pdf",
          size: 1024,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.filename).toBe("document.pdf");
      expect(response.body.contentType).toBe("application/pdf");
      expect(response.body.size).toBe(1024);
      expect(response.body.blobUrl).toBeDefined();
    });

    it("should allow staff to upload attachment to any request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          filename: "response.pdf",
          contentType: "application/pdf",
          size: 2048,
        });

      expect(response.status).toBe(201);
      expect(response.body.uploadedBy).toBe("staff-001");
    });

    it("should not allow citizen to upload attachment to another citizen's request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "document.pdf",
          contentType: "application/pdf",
          size: 1024,
        });

      expect(response.status).toBe(404);
    });

    it("should reject invalid content type", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "script.js",
          contentType: "application/javascript",
          size: 1024,
        });

      expect(response.status).toBe(400);
    });

    it("should reject file exceeding size limit", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "large-file.pdf",
          contentType: "application/pdf",
          size: 11 * 1024 * 1024,
        });

      expect(response.status).toBe(400);
    });

    it("should reject invalid filename", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "../etc/passwd",
          contentType: "text/plain",
          size: 1024,
        });

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent request", async () => {
      const response = await request(app)
        .post("/api/requests/non-existent/attachments")
        .set("Authorization", createAuthHeader("staff"))
        .send({
          filename: "document.pdf",
          contentType: "application/pdf",
          size: 1024,
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/requests/:requestId/attachments", () => {
    it("should get attachments for own request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      // Add some attachments
      await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "document1.pdf",
          contentType: "application/pdf",
          size: 1024,
        });

      await request(app)
        .post(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "image.png",
          contentType: "image/png",
          size: 2048,
        });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("should not allow citizen to get attachments for another citizen's request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("should allow staff to get attachments for any request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
    });

    it("should return empty array for request with no attachments", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/attachments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("Attachment Upload Flow", () => {
    it("should support multiple attachment uploads", async () => {
      // Create request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Request with attachments",
          description: "Need to attach multiple files",
          priority: "high",
        });

      const requestId = createResponse.body.id;

      // Upload PDF
      await request(app)
        .post(`/api/requests/${requestId}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "document.pdf",
          contentType: "application/pdf",
          size: 1024,
        });

      // Upload image
      await request(app)
        .post(`/api/requests/${requestId}/attachments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          filename: "screenshot.png",
          contentType: "image/png",
          size: 2048,
        });

      // Staff uploads response document
      await request(app)
        .post(`/api/requests/${requestId}/attachments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          filename: "response.pdf",
          contentType: "application/pdf",
          size: 3072,
        });

      // Get all attachments
      const attachmentsResponse = await request(app)
        .get(`/api/requests/${requestId}/attachments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(attachmentsResponse.body).toHaveLength(3);
      
      const filenames = attachmentsResponse.body.map((a: { filename: string }) => a.filename);
      expect(filenames).toContain("document.pdf");
      expect(filenames).toContain("screenshot.png");
      expect(filenames).toContain("response.pdf");
    });
  });
});
