import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import {
  clearMockDb,
  createServiceRequest,
  createNotification,
  getMockDb,
} from "../helpers/mock-db.js";
import { createAuthHeader } from "../helpers/mock-auth.js";

// Mock the logger
vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Notifications Integration Tests", () => {
  const app = createApp();

  beforeEach(() => {
    clearMockDb();
    vi.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should get notifications for the authenticated user", async () => {
      // Create some notifications
      createNotification({
        recipientId: "citizen-001",
        type: "status-change",
        message: "Your request status changed",
        relatedRequestId: "sr-123",
      });
      createNotification({
        recipientId: "citizen-001",
        type: "new-comment",
        message: "New comment on your request",
        relatedRequestId: "sr-123",
      });
      createNotification({
        recipientId: "citizen-002",
        type: "status-change",
        message: "Other user notification",
      });

      const response = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every((n: { recipientId: string }) => n.recipientId === "citizen-001")).toBe(true);
    });

    it("should return empty array when user has no notifications", async () => {
      const response = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/notifications");

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    it("should mark a notification as read", async () => {
      const notification = createNotification({
        recipientId: "citizen-001",
        type: "status-change",
        message: "Your request status changed",
      });

      const response = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(200);
      expect(response.body.read).toBe(true);
    });

    it("should not allow marking another user's notification as read", async () => {
      const notification = createNotification({
        recipientId: "citizen-002",
        type: "status-change",
        message: "Other user notification",
      });

      const response = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("should return 404 for non-existent notification", async () => {
      const response = await request(app)
        .patch("/api/notifications/non-existent/read")
        .set("Authorization", createAuthHeader("citizen"));

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).patch("/api/notifications/some-id/read");

      expect(response.status).toBe(401);
    });
  });

  describe("Notification Flow", () => {
    it("should create notification when request status changes", async () => {
      // Create a request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Test Request",
          description: "Description",
          priority: "medium",
        });

      const requestId = createResponse.body.id;

      // Staff updates status
      await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          status: "in-progress",
        });

      // Check notifications
      const notificationsResponse = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      expect(notificationsResponse.body).toHaveLength(1);
      expect(notificationsResponse.body[0].type).toBe("status-change");
      expect(notificationsResponse.body[0].relatedRequestId).toBe(requestId);
    });

    it("should create notification when staff comments on request", async () => {
      // Create a request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Test Request",
          description: "Description",
          priority: "medium",
        });

      const requestId = createResponse.body.id;

      // Staff adds comment
      await request(app)
        .post(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({
          content: "Staff response",
        });

      // Check notifications
      const notificationsResponse = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      expect(notificationsResponse.body).toHaveLength(1);
      expect(notificationsResponse.body[0].type).toBe("new-comment");
    });

    it("should support full notification lifecycle", async () => {
      // Create a request
      const createResponse = await request(app)
        .post("/api/requests")
        .set("Authorization", createAuthHeader("citizen"))
        .send({
          title: "Test Request",
          description: "Description",
          priority: "high",
        });

      const requestId = createResponse.body.id;

      // Staff updates status twice and adds comments
      await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({ status: "in-progress" });

      await request(app)
        .post(`/api/requests/${requestId}/comments`)
        .set("Authorization", createAuthHeader("staff"))
        .send({ content: "Working on it" });

      await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set("Authorization", createAuthHeader("staff"))
        .send({ status: "resolved" });

      // Get all notifications
      const notificationsResponse = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      expect(notificationsResponse.body.length).toBeGreaterThanOrEqual(3);

      // Mark first notification as read
      const firstNotification = notificationsResponse.body[0];
      await request(app)
        .patch(`/api/notifications/${firstNotification.id}/read`)
        .set("Authorization", createAuthHeader("citizen"));

      // Verify it's marked as read
      const updatedNotifications = await request(app)
        .get("/api/notifications")
        .set("Authorization", createAuthHeader("citizen"));

      const markedNotification = updatedNotifications.body.find(
        (n: { id: string }) => n.id === firstNotification.id
      );
      expect(markedNotification.read).toBe(true);
    });
  });
});
