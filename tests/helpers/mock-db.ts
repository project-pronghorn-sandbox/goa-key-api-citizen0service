/**
 * In-memory database mock for testing repository methods.
 * Simulates basic CRUD operations with service requests.
 */

import type {
  ServiceRequest,
  Comment,
  Attachment,
  Notification,
} from "../../src/types/models.js";
import type { DatabaseInterface } from "../../src/lib/database.js";

// Re-export types for backwards compatibility
export type { ServiceRequest, Comment, Attachment, Notification };

export interface MockDatabase {
  serviceRequests: Map<string, ServiceRequest>;
  comments: Map<string, Comment>;
  attachments: Map<string, Attachment>;
  notifications: Map<string, Notification>;
}

let db: MockDatabase;

/**
 * Initialize or reset the mock database.
 */
export function initMockDb(): MockDatabase {
  db = {
    serviceRequests: new Map(),
    comments: new Map(),
    attachments: new Map(),
    notifications: new Map(),
  };
  return db;
}

/**
 * Get the current mock database instance.
 */
export function getMockDb(): MockDatabase {
  if (!db) {
    return initMockDb();
  }
  return db;
}

/**
 * Clear all data from the mock database.
 */
export function clearMockDb(): void {
  initMockDb();
}

/**
 * Generate a unique ID for mock database records.
 */
export function generateId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Service Request Operations

export function createServiceRequest(data: Omit<ServiceRequest, "id" | "createdAt" | "updatedAt">): ServiceRequest {
  const database = getMockDb();
  const request: ServiceRequest = {
    ...data,
    id: generateId("sr"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  database.serviceRequests.set(request.id, request);
  return request;
}

export function getServiceRequestById(id: string): ServiceRequest | undefined {
  return getMockDb().serviceRequests.get(id);
}

export function getServiceRequestsByCitizen(citizenId: string): ServiceRequest[] {
  const database = getMockDb();
  return Array.from(database.serviceRequests.values()).filter((r) => r.citizenId === citizenId);
}

export function getAllServiceRequests(): ServiceRequest[] {
  return Array.from(getMockDb().serviceRequests.values());
}

export function updateServiceRequest(id: string, updates: Partial<Omit<ServiceRequest, "id" | "createdAt">>): ServiceRequest | undefined {
  const database = getMockDb();
  const existing = database.serviceRequests.get(id);
  if (!existing) return undefined;

  // Filter out undefined values to preserve existing fields
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  const updated: ServiceRequest = {
    ...existing,
    ...filteredUpdates,
    updatedAt: new Date(),
  };
  database.serviceRequests.set(id, updated);
  return updated;
}

export function deleteServiceRequest(id: string): boolean {
  return getMockDb().serviceRequests.delete(id);
}

// Comment Operations

export function createComment(data: Omit<Comment, "id" | "createdAt">): Comment {
  const database = getMockDb();
  const comment: Comment = {
    ...data,
    id: generateId("c"),
    createdAt: new Date(),
  };
  database.comments.set(comment.id, comment);
  return comment;
}

export function getCommentsByRequest(requestId: string): Comment[] {
  const database = getMockDb();
  return Array.from(database.comments.values()).filter((c) => c.requestId === requestId);
}

export function getCommentById(id: string): Comment | undefined {
  return getMockDb().comments.get(id);
}

export function deleteComment(id: string): boolean {
  return getMockDb().comments.delete(id);
}

// Attachment Operations

export function createAttachment(data: Omit<Attachment, "id" | "uploadedAt">): Attachment {
  const database = getMockDb();
  const attachment: Attachment = {
    ...data,
    id: generateId("a"),
    uploadedAt: new Date(),
  };
  database.attachments.set(attachment.id, attachment);
  return attachment;
}

export function getAttachmentsByRequest(requestId: string): Attachment[] {
  const database = getMockDb();
  return Array.from(database.attachments.values()).filter((a) => a.requestId === requestId);
}

export function getAttachmentById(id: string): Attachment | undefined {
  return getMockDb().attachments.get(id);
}

export function deleteAttachment(id: string): boolean {
  return getMockDb().attachments.delete(id);
}

// Notification Operations

export function createNotification(data: Omit<Notification, "id" | "createdAt" | "read">): Notification {
  const database = getMockDb();
  const notification: Notification = {
    ...data,
    id: generateId("n"),
    read: false,
    createdAt: new Date(),
  };
  database.notifications.set(notification.id, notification);
  return notification;
}

export function getNotificationsByRecipient(recipientId: string): Notification[] {
  const database = getMockDb();
  return Array.from(database.notifications.values()).filter((n) => n.recipientId === recipientId);
}

export function markNotificationAsRead(id: string): Notification | undefined {
  const database = getMockDb();
  const notification = database.notifications.get(id);
  if (!notification) return undefined;

  notification.read = true;
  database.notifications.set(id, notification);
  return notification;
}

export function deleteNotification(id: string): boolean {
  return getMockDb().notifications.delete(id);
}

// Seed data for testing

export function seedTestData(): void {
  clearMockDb();

  // Create some test service requests
  createServiceRequest({
    citizenId: "citizen-001",
    title: "Test Request 1",
    description: "First test request",
    status: "pending",
    priority: "medium",
  });

  createServiceRequest({
    citizenId: "citizen-001",
    title: "Test Request 2",
    description: "Second test request",
    status: "in-progress",
    priority: "high",
    assignedTo: "staff-001",
  });

  createServiceRequest({
    citizenId: "citizen-002",
    title: "Another Citizen Request",
    description: "This belongs to a different citizen",
    status: "pending",
    priority: "low",
  });
}

/**
 * Create a mock database implementation that implements DatabaseInterface.
 * This allows the repository to use the mock database for testing.
 */
export function createMockDatabaseImplementation(): DatabaseInterface {
  return {
    createServiceRequest,
    getServiceRequestById,
    getServiceRequestsByCitizen,
    getAllServiceRequests,
    updateServiceRequest,
    deleteServiceRequest,
    createComment,
    getCommentsByRequest,
    createAttachment,
    getAttachmentsByRequest,
    createNotification,
    getNotificationsByRecipient,
    markNotificationAsRead,
  };
}
