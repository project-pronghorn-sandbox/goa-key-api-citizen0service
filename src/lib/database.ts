/**
 * Database interface for service request operations.
 * In production, this would be implemented by Azure SQL or Cosmos DB clients.
 * For testing, this is implemented by the mock database.
 */

import type { ServiceRequest, Comment, Attachment, Notification } from "../types/models.js";

export interface DatabaseInterface {
  // Service Request operations
  createServiceRequest(data: Omit<ServiceRequest, "id" | "createdAt" | "updatedAt">): ServiceRequest;
  getServiceRequestById(id: string): ServiceRequest | undefined;
  getServiceRequestsByCitizen(citizenId: string): ServiceRequest[];
  getAllServiceRequests(): ServiceRequest[];
  updateServiceRequest(id: string, updates: Partial<Omit<ServiceRequest, "id" | "createdAt">>): ServiceRequest | undefined;
  deleteServiceRequest(id: string): boolean;

  // Comment operations
  createComment(data: Omit<Comment, "id" | "createdAt">): Comment;
  getCommentsByRequest(requestId: string): Comment[];

  // Attachment operations
  createAttachment(data: Omit<Attachment, "id" | "uploadedAt">): Attachment;
  getAttachmentsByRequest(requestId: string): Attachment[];

  // Notification operations
  createNotification(data: Omit<Notification, "id" | "createdAt" | "read">): Notification;
  getNotificationsByRecipient(recipientId: string): Notification[];
  markNotificationAsRead(id: string): Notification | undefined;
}

// Default database implementation - will be set by the application or tests
let database: DatabaseInterface | null = null;

export function setDatabase(db: DatabaseInterface): void {
  database = db;
}

export function getDatabase(): DatabaseInterface {
  if (!database) {
    throw new Error("Database not initialized. Call setDatabase() first.");
  }
  return database;
}
