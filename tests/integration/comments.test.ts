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

describe("Comments Integration Tests", () => {
  const app = createApp();

  beforeEach(() => {
    clearMockDb();
    vi.clearAllMocks();
  });

  describe("POST /api/requests/:requestId/comments", () => {
    it("should add a comment to own request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          content: "This is my comment",
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBe("This is my comment");
      expect(response.body.authorId).toBe("citizen-001");
      expect(response.body.authorRole).toBe("citizen");
    });

    it("should allow staff to comment on any request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          content: "Staff response",
        });

      expect(response.status).toBe(201);
      expect(response.body.authorRole).toBe("staff");
    });

    it("should create notification when staff comments", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          content: "Staff response",
        });

      const notifications = Array.from(getMockDb().notifications.values());
      expect(notifications).toHaveLength(1);
      expect(notifications[0].recipientId).toBe("citizen-001");
      expect(notifications[0].type).toBe("new-comment");
    });

    it("should not create notification when citizen comments on own request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          content: "My own comment",
        });

      const notifications = Array.from(getMockDb().notifications.values());
      expect(notifications).toHaveLength(0);
    });

    it("should notify assigned staff when citizen comments", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "in-progress",
        priority: "medium",
        assignedTo: "staff-001",
      });

      await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          content: "Question about my request",
        });

      const notifications = Array.from(getMockDb().notifications.values());
      const staffNotification = notifications.find((n) => n.recipientId === "staff-001");
      expect(staffNotification).toBeDefined();
      expect(staffNotification?.type).toBe("new-comment");
    });

    it("should not allow citizen to comment on another citizen's request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          content: "Trying to comment",
        });

      expect(response.status).toBe(404);
    });

    it("should reject empty comment", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          content: "",
        });

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent request", async () => {
      const response = await request(app)
        .post("/api/requests/non-existent/comments")
        .set("Authorization", createAuthHeader("staff"))
        .send({
          content: "Comment",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/requests/:requestId/comments", () => {
    it("should get comments for own request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      // Add some comments
      await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({ content: "Comment 1" });

      await request(app)
        .post(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({ content: "Comment 2" });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("should not allow citizen to get comments for another citizen's request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-002",
        title: "Other Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("should allow staff to get comments for any request", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("staff"));

      expect(response.status).toBe(200);
    });

    it("should return empty array for request with no comments", async () => {
      const serviceRequest = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Description",
        status: "pending",
        priority: "medium",
      });

      const response = await request(app)
        .get(`/api/requests/${serviceRequest.id}/comments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("Comment Flow", () => {
    it("should support full comment conversation flow", async () => {
      // Citizen creates request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Help needed",
          description: "I need assistance",
          priority: "high",
        });

      const requestId = createResponse.body.id;

      // Citizen adds initial comment
      await request(app)
        .post(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({ content: "Please help with this issue" });

      // Staff responds
      await request(app)
        .post(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({ content: "Looking into this now" });

      // Citizen follows up
      await request(app)
        .post(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("citizen"))
        .send({ content: "Thank you for the quick response" });

      // Get all comments
      const commentsResponse = await request(app)
        .get(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(commentsResponse.body).toHaveLength(3);
      expect(commentsResponse.body[0].content).toBe("Please help with this issue");
      expect(commentsResponse.body[1].content).toBe("Looking into this now");
      expect(commentsResponse.body[2].content).toBe("Thank you for the quick response");
    });
  });
});
