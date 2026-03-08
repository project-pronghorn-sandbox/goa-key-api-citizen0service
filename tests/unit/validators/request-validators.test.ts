import { describe, it, expect } from "vitest";
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
  updateStatusSchema,
  createCommentSchema,
  listRequestsQuerySchema,
  attachmentSchema,
} from "../../../src/validators/request-validators.js";

describe("Request Validators", () => {
  describe("createServiceRequestSchema", () => {
    it("should validate a valid service request", () => {
      const validRequest = {
        title: "Test Request",
        description: "This is a test request description",
        priority: "high" as const,
      };

      const result = createServiceRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Request");
        expect(result.data.description).toBe("This is a test request description");
        expect(result.data.priority).toBe("high");
      }
    });

    it("should use default priority if not provided", () => {
      const request = {
        title: "Test Request",
        description: "This is a test request description",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("medium");
      }
    });

    it("should reject empty title", () => {
      const request = {
        title: "",
        description: "This is a test request description",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Title is required");
      }
    });

    it("should reject missing title", () => {
      const request = {
        description: "This is a test request description",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject title exceeding 200 characters", () => {
      const request = {
        title: "a".repeat(201),
        description: "This is a test request description",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Title must be at most 200 characters");
      }
    });

    it("should reject empty description", () => {
      const request = {
        title: "Test Request",
        description: "",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Description is required");
      }
    });

    it("should reject description exceeding 5000 characters", () => {
      const request = {
        title: "Test Request",
        description: "a".repeat(5001),
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Description must be at most 5000 characters");
      }
    });

    it("should reject invalid priority", () => {
      const request = {
        title: "Test Request",
        description: "This is a test request description",
        priority: "critical",
      };

      const result = createServiceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("updateServiceRequestSchema", () => {
    it("should validate partial updates", () => {
      const update = {
        title: "Updated Title",
      };

      const result = updateServiceRequestSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Updated Title");
        expect(result.data.description).toBeUndefined();
      }
    });

    it("should validate empty object (no updates)", () => {
      const result = updateServiceRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject empty title string in update", () => {
      const update = {
        title: "",
      };

      const result = updateServiceRequestSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("updateStatusSchema", () => {
    it("should validate status update with reason", () => {
      const update = {
        status: "in-progress" as const,
        reason: "Starting work on this request",
      };

      const result = updateStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("in-progress");
        expect(result.data.reason).toBe("Starting work on this request");
      }
    });

    it("should validate status update without reason", () => {
      const update = {
        status: "resolved" as const,
      };

      const result = updateStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const update = {
        status: "invalid-status",
      };

      const result = updateStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject reason exceeding 1000 characters", () => {
      const update = {
        status: "resolved" as const,
        reason: "a".repeat(1001),
      };

      const result = updateStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("createCommentSchema", () => {
    it("should validate a valid comment", () => {
      const comment = {
        content: "This is a comment",
      };

      const result = createCommentSchema.safeParse(comment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("This is a comment");
      }
    });

    it("should reject empty content", () => {
      const comment = {
        content: "",
      };

      const result = createCommentSchema.safeParse(comment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Comment content is required");
      }
    });

    it("should reject content exceeding 2000 characters", () => {
      const comment = {
        content: "a".repeat(2001),
      };

      const result = createCommentSchema.safeParse(comment);
      expect(result.success).toBe(false);
    });
  });

  describe("listRequestsQuerySchema", () => {
    it("should use default values", () => {
      const result = listRequestsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should parse page and limit from strings", () => {
      const query = {
        page: "2",
        limit: "50",
      };

      const result = listRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it("should accept status filter", () => {
      const query = {
        status: "pending",
      };

      const result = listRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("pending");
      }
    });

    it("should reject limit exceeding 100", () => {
      const query = {
        limit: "101",
      };

      const result = listRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric page", () => {
      const query = {
        page: "abc",
      };

      const result = listRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it("should reject page less than 1", () => {
      const query = {
        page: "0",
      };

      const result = listRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe("attachmentSchema", () => {
    it("should validate a valid attachment", () => {
      const attachment = {
        filename: "document.pdf",
        contentType: "application/pdf",
        size: 1024,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(true);
    });

    it("should accept valid content types", () => {
      const validTypes = ["image/jpeg", "image/png", "application/pdf", "text/plain"];

      for (const contentType of validTypes) {
        const attachment = {
          filename: "test.txt",
          contentType,
          size: 1024,
        };

        const result = attachmentSchema.safeParse(attachment);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid content type", () => {
      const attachment = {
        filename: "script.js",
        contentType: "application/javascript",
        size: 1024,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(false);
    });

    it("should reject filename with invalid characters", () => {
      const attachment = {
        filename: "../etc/passwd",
        contentType: "text/plain",
        size: 1024,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(false);
    });

    it("should reject empty filename", () => {
      const attachment = {
        filename: "",
        contentType: "text/plain",
        size: 1024,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(false);
    });

    it("should reject size exceeding 10MB", () => {
      const attachment = {
        filename: "large-file.pdf",
        contentType: "application/pdf",
        size: 11 * 1024 * 1024,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(false);
    });

    it("should reject zero size", () => {
      const attachment = {
        filename: "empty.txt",
        contentType: "text/plain",
        size: 0,
      };

      const result = attachmentSchema.safeParse(attachment);
      expect(result.success).toBe(false);
    });
  });
});
