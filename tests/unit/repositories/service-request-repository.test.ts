import { describe, it, expect, beforeEach } from "vitest";
import { ServiceRequestRepository } from "../../../src/repositories/service-request-repository.js";
import { clearMockDb, createServiceRequest, getMockDb } from "../../helpers/mock-db.js";

describe("ServiceRequestRepository", () => {
  let repo: ServiceRequestRepository;

  beforeEach(() => {
    clearMockDb();
    repo = new ServiceRequestRepository();
  });

  describe("create", () => {
    it("should create a new service request", async () => {
      const input = {
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Test description",
        priority: "high" as const,
      };

      const result = await repo.create(input);

      expect(result.id).toBeDefined();
      expect(result.citizenId).toBe("citizen-001");
      expect(result.title).toBe("Test Request");
      expect(result.description).toBe("Test description");
      expect(result.priority).toBe("high");
      expect(result.status).toBe("pending");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should store the request in the database", async () => {
      const input = {
        citizenId: "citizen-001",
        title: "Test Request",
        description: "Test description",
        priority: "medium" as const,
      };

      const result = await repo.create(input);
      const stored = getMockDb().serviceRequests.get(result.id);

      expect(stored).toEqual(result);
    });
  });

  describe("getById", () => {
    it("should return a request by ID", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.getById(created.id);

      expect(result).toEqual(created);
    });

    it("should return undefined for non-existent ID", async () => {
      const result = await repo.getById("non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("getByIdForCitizen", () => {
    it("should return request if citizen is owner", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.getByIdForCitizen(created.id, "citizen-001");

      expect(result).toEqual(created);
    });

    it("should return undefined if citizen is not owner", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.getByIdForCitizen(created.id, "citizen-002");

      expect(result).toBeUndefined();
    });

    it("should return undefined for non-existent ID", async () => {
      const result = await repo.getByIdForCitizen("non-existent", "citizen-001");

      expect(result).toBeUndefined();
    });
  });

  describe("list", () => {
    beforeEach(() => {
      // Create test data
      createServiceRequest({
        citizenId: "citizen-001",
        title: "Request 1",
        description: "Desc 1",
        status: "pending",
        priority: "low",
      });
      createServiceRequest({
        citizenId: "citizen-001",
        title: "Request 2",
        description: "Desc 2",
        status: "in-progress",
        priority: "high",
      });
      createServiceRequest({
        citizenId: "citizen-002",
        title: "Request 3",
        description: "Desc 3",
        status: "pending",
        priority: "medium",
      });
    });

    it("should list all requests with pagination", async () => {
      const result = await repo.list({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by citizenId", async () => {
      const result = await repo.list({ page: 1, limit: 10, citizenId: "citizen-001" });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.citizenId === "citizen-001")).toBe(true);
    });

    it("should filter by status", async () => {
      const result = await repo.list({ page: 1, limit: 10, status: "pending" });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.status === "pending")).toBe(true);
    });

    it("should filter by priority", async () => {
      const result = await repo.list({ page: 1, limit: 10, priority: "high" });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].priority).toBe("high");
    });

    it("should paginate correctly", async () => {
      const page1 = await repo.list({ page: 1, limit: 2 });
      const page2 = await repo.list({ page: 2, limit: 2 });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(1);
      expect(page1.totalPages).toBe(2);
    });

    it("should sort by creation date descending", async () => {
      const result = await repo.list({ page: 1, limit: 10 });

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.data[i + 1].createdAt.getTime()
        );
      }
    });

    it("should combine multiple filters", async () => {
      const result = await repo.list({
        page: 1,
        limit: 10,
        citizenId: "citizen-001",
        status: "pending",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].citizenId).toBe("citizen-001");
      expect(result.data[0].status).toBe("pending");
    });
  });

  describe("update", () => {
    it("should update a request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Original Title",
        description: "Original",
        status: "pending",
        priority: "low",
      });

      const result = await repo.update(created.id, {
        title: "Updated Title",
        status: "in-progress",
      });

      expect(result?.title).toBe("Updated Title");
      expect(result?.status).toBe("in-progress");
      expect(result?.description).toBe("Original");
    });

    it("should return undefined for non-existent ID", async () => {
      const result = await repo.update("non-existent", { title: "New" });

      expect(result).toBeUndefined();
    });

    it("should update the updatedAt timestamp", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await repo.update(created.id, { title: "Updated" });

      expect(result?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("updateForCitizen", () => {
    it("should update request if citizen is owner", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Original",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.updateForCitizen(created.id, "citizen-001", { title: "Updated" });

      expect(result?.title).toBe("Updated");
    });

    it("should not update request if citizen is not owner", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Original",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.updateForCitizen(created.id, "citizen-002", { title: "Updated" });

      expect(result).toBeUndefined();

      // Verify original is unchanged
      const stored = getMockDb().serviceRequests.get(created.id);
      expect(stored?.title).toBe("Original");
    });
  });

  describe("delete", () => {
    it("should delete a request", async () => {
      const created = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const result = await repo.delete(created.id);

      expect(result).toBe(true);
      expect(getMockDb().serviceRequests.has(created.id)).toBe(false);
    });

    it("should return false for non-existent ID", async () => {
      const result = await repo.delete("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("comments", () => {
    it("should add a comment to a request", async () => {
      const request = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const comment = await repo.addComment(request.id, "staff-001", "staff", "This is a comment");

      expect(comment.id).toBeDefined();
      expect(comment.requestId).toBe(request.id);
      expect(comment.authorId).toBe("staff-001");
      expect(comment.authorRole).toBe("staff");
      expect(comment.content).toBe("This is a comment");
    });

    it("should get comments for a request", async () => {
      const request = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      await repo.addComment(request.id, "citizen-001", "citizen", "Comment 1");
      await repo.addComment(request.id, "staff-001", "staff", "Comment 2");

      const comments = await repo.getComments(request.id);

      expect(comments).toHaveLength(2);
    });

    it("should return empty array for request with no comments", async () => {
      const request = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const comments = await repo.getComments(request.id);

      expect(comments).toHaveLength(0);
    });
  });

  describe("attachments", () => {
    it("should add an attachment to a request", async () => {
      const request = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      const attachment = await repo.addAttachment(
        request.id,
        "citizen-001",
        "document.pdf",
        "application/pdf",
        1024,
        "https://blob.storage/document.pdf"
      );

      expect(attachment.id).toBeDefined();
      expect(attachment.requestId).toBe(request.id);
      expect(attachment.filename).toBe("document.pdf");
      expect(attachment.contentType).toBe("application/pdf");
      expect(attachment.size).toBe(1024);
    });

    it("should get attachments for a request", async () => {
      const request = createServiceRequest({
        citizenId: "citizen-001",
        title: "Test",
        description: "Test",
        status: "pending",
        priority: "medium",
      });

      await repo.addAttachment(request.id, "citizen-001", "file1.pdf", "application/pdf", 1024);
      await repo.addAttachment(request.id, "citizen-001", "file2.png", "image/png", 2048);

      const attachments = await repo.getAttachments(request.id);

      expect(attachments).toHaveLength(2);
    });
  });

  describe("notifications", () => {
    it("should create a notification", async () => {
      const notification = await repo.createNotification(
        "citizen-001",
        "status-change",
        "Your request status has changed",
        "sr-123"
      );

      expect(notification.id).toBeDefined();
      expect(notification.recipientId).toBe("citizen-001");
      expect(notification.type).toBe("status-change");
      expect(notification.message).toBe("Your request status has changed");
      expect(notification.read).toBe(false);
    });

    it("should get notifications for a user", async () => {
      await repo.createNotification("citizen-001", "status-change", "Message 1");
      await repo.createNotification("citizen-001", "new-comment", "Message 2");
      await repo.createNotification("citizen-002", "status-change", "Other user");

      const notifications = await repo.getNotifications("citizen-001");

      expect(notifications).toHaveLength(2);
      expect(notifications.every((n) => n.recipientId === "citizen-001")).toBe(true);
    });

    it("should mark notification as read", async () => {
      const notification = await repo.createNotification(
        "citizen-001",
        "status-change",
        "Test message"
      );

      expect(notification.read).toBe(false);

      const updated = await repo.markNotificationRead(notification.id);

      expect(updated?.read).toBe(true);
    });
  });
});
