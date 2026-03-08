import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { clearMockDb, createServiceRequest, getMockDb } from "../helpers/mock-db.js";
import { createAuthHeader, createSecondCitizen } from "../helpers/mock-auth.js";

// Mock the logger
vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Requests Integration Tests", () => {
  const app = createApp();

  beforeEach(() => {
    clearMockDb();
    vi.clearAllMocks();
  });

  describe("POST /api/requests", () => {
    it("should create a new service request", async () => {
      const response = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Test Request",
          description: "This is a test request",
          priority: "high",
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe("Test Request");
      expect(response.body.description).toBe("This is a test request");
      expect(response.body.priority).toBe("high");
      expect(response.body.status).toBe("pending");
      expect(response.body.citizenId).toBe("citizen-001");
    });

    it("should use default priority when not provided", async () => {
      const response = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Test Request",
          description: "This is a test request",
        });

      expect(response.status).toBe(201);
      expect(response.body.priority).toBe("medium");
    });

    it("should reject request without authentication", async () => {
      const response = await request(app).post("/api/requests").send({
        title: "Test Request",
        description: "This is a test request",
      });

      expect(response.status).toBe(401);
    });

    it("should reject request with invalid data", async () => {
      const response = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "",
          description: "This is a test request",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("Title is required");
    });
  });

  describe("GET /api/requests", () => {
    beforeEach(() => {
      createServiceRequest({
        citizenId: "citizen-001",
        title: "Request 1",
        description: "Description 1",
        status: "pending",
        priority: "low",
      });
      createServiceRequest({
        citizenId: "citizen-001",
        title: "Request 2",
        description: "Description 2",
        status: "in-progress",
        priority: "high",
      });
      createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Citizen Request",
        description: "Description 3",
        status: "pending",
        priority: "medium",
      });
    });

    it("should return only citizen's own requests", async () => {
      const response = await request(app)
        .get("/api/requests")
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((r: { citizenId: string }) => r.citizenId === "citizen-001")).toBe(true);
      expect(response.body.total).toBe(2);
    });

    it("should return all requests for staff", async () => {
      const response = await request(app)
        .get("/api/requests")
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it("should return all requests for admin", async () => {
      const response = await request(app)
        .get("/api/requests")
        .set("Authorization", createAuthHeader("admin"));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/requests?page=1&limit=2")
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.totalPages).toBe(2);
    });

    it("should support status filter", async () => {
      const response = await request(app)
        .get("/api/requests?status=pending")
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
      expect(response.body.data.every((r: { status: string }) => r.status === "pending")).toBe(true);
    });
  });

  describe("GET /api/requests/:id", () => {
    it("should return a specific request for the owner", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.title).toBe("Test Request");
    });

    it("should return 404 when citizen tries to access another citizen's request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("should allow staff to access any request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
    });

    it("should return 404 for non-existent request", async () => {
      const response = await request(app)
        .get("/api/requests/non-existent")
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/requests/:id", () => {
    it("should update own request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Original Title",
        description: "Original Description",
        status: "pending",
        priority: "low",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Updated Title");
      expect(response.body.description).toBe("Original Description");
    });

    it("should not allow citizen to update another citizen's request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Hacked Title",
        });

      expect(response.status).toBe(404);

      // Verify original is unchanged
      const stored = getMockDb().serviceRequests.get(created.id);
      expect(stored?.title).toBe("Other Request");
    });

    it("should allow staff to update any request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Original Title",
        description: "Description",
        status: "pending",
        priority: "low",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          title: "Staff Updated",
          priority: "high",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Staff Updated");
      expect(response.body.priority).toBe("high");
    });
  });

  describe("PATCH /api/requests/:id/status", () => {
    it("should allow staff to update status", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          status: "in-progress",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("in-progress");
    });

    it("should create notification when status changes", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      await request(app)
        .patch(`/api/requests/${created.id}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          status: "resolved",
        });

      const notifications = Array.from(getMockDb().notifications.values());
      expect(notifications).toHaveLength(1);
      expect(notifications[0].recipientId).toBe("citizen-001");
      expect(notifications[0].type).toBe("status-change");
    });

    it("should not allow citizen to update status", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}/status`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          status: "resolved",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/requests/:id", () => {
    it("should allow admin to delete a request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .delete(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("admin"));

      expect(response.status).toBe(204);
      expect(getMockDb().serviceRequests.has(created.id)).toBe(false);
    });

    it("should not allow staff to delete a request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .delete(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(403);
      expect(getMockDb().serviceRequests.has(created.id)).toBe(true);
    });

    it("should not allow citizen to delete a request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .delete(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(403);
    });
  });

  describe("Row-Level Security", () => {
    it("citizen A cannot see citizen B's requests in list", async () => {
      createServiceRequest({
        citizenId: "citizen-002",
        title: "Citizen B Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get("/api/requests")
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it("citizen A cannot access citizen B's request by ID", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-002",
        title: "Citizen B Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("citizen A cannot update citizen B's request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-002",
        title: "Citizen B Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .patch(`/api/requests/${created.id}`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Hacked",
        });

      expect(response.status).toBe(404);
      expect(getMockDb().serviceRequests.get(created.id)?.title).toBe("Citizen B Request");
    });
  });

  describe("Full Request Lifecycle", () => {
    it("should complete full CRUD lifecycle", async () => {
      // Create request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Lifecycle Test",
          description: "Testing full lifecycle",
          priority: "high",
        });

      expect(createResponse.status).toBe(201);
      const requestId = createResponse.body.id;

      // Read request
      const getResponse = await request(app)
        .get(`/api/requests/${requestId}`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.title).toBe("Lifecycle Test");

      // Update request
      const updateResponse = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          description: "Updated description",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.description).toBe("Updated description");

      // Staff updates status
      const statusResponse = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          status: "in-progress",
        });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe("in-progress");

      // Resolve the request
      const resolveResponse = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          status: "resolved",
        });

      expect(resolveResponse.status).toBe(200);
      expect(resolveResponse.body.status).toBe("resolved");

      // Admin deletes request
      const deleteResponse = await request(app)
        .delete(`/api/requests/${requestId}`)
        .set("Authorization", createAuthHeader("admin"));

      expect(deleteResponse.status).toBe(204);

      // Verify deleted
      const verifyResponse = await request(app)
        .get(`/api/requests/${requestId}`)
        .set("Authorization", createAuthHeader("admin"));

      expect(verifyResponse.status).toBe(404);
    });
  });
});
