/**
 * Service Request Repository
 * Handles data access for service requests with row-level security.
 */

import type { ServiceRequest, Comment, Attachment, Notification } from "../types/models.js";
import { getDatabase } from "../lib/database.js";

export interface CreateRequestInput {
  citizenId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface UpdateRequestInput {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in-progress" | "resolved" | "closed";
  assignedTo?: string;
}

export interface ListRequestsOptions {
  page: number;
  limit: number;
  status?: "pending" | "in-progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high";
  citizenId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service Request Repository class
 */
export class ServiceRequestRepository {
  /**
   * Create a new service request.
   */
  async create(input: CreateRequestInput): Promise<ServiceRequest> {
    const db = getDatabase();
    return db.createServiceRequest({
      citizenId: input.citizenId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "pending",
    });
  }

  /**
   * Get a service request by ID.
   * Returns undefined if not found.
   */
  async getById(id: string): Promise<ServiceRequest | undefined> {
    const db = getDatabase();
    return db.getServiceRequestById(id);
  }

  /**
   * Get a service request by ID, only if it belongs to the specified citizen.
   * Used for row-level security.
   */
  async getByIdForCitizen(id: string, citizenId: string): Promise<ServiceRequest | undefined> {
    const db = getDatabase();
    const request = db.getServiceRequestById(id);
    if (!request) return undefined;
    if (request.citizenId !== citizenId) return undefined;
    return request;
  }

  /**
   * List service requests with pagination and filters.
   */
  async list(options: ListRequestsOptions): Promise<PaginatedResult<ServiceRequest>> {
    const db = getDatabase();
    let requests: ServiceRequest[];

    if (options.citizenId) {
      requests = db.getServiceRequestsByCitizen(options.citizenId);
    } else {
      requests = db.getAllServiceRequests();
    }

    // Apply filters
    if (options.status) {
      requests = requests.filter((r) => r.status === options.status);
    }
    if (options.priority) {
      requests = requests.filter((r) => r.priority === options.priority);
    }

    // Sort by creation date (newest first)
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = requests.length;
    const start = (options.page - 1) * options.limit;
    const data = requests.slice(start, start + options.limit);

    return {
      data,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * Update a service request.
   */
  async update(id: string, input: UpdateRequestInput): Promise<ServiceRequest | undefined> {
    const db = getDatabase();
    return db.updateServiceRequest(id, input);
  }

  /**
   * Update a service request only if it belongs to the specified citizen.
   */
  async updateForCitizen(
    id: string,
    citizenId: string,
    input: UpdateRequestInput
  ): Promise<ServiceRequest | undefined> {
    const db = getDatabase();
    const existing = db.getServiceRequestById(id);
    if (!existing || existing.citizenId !== citizenId) {
      return undefined;
    }
    return db.updateServiceRequest(id, input);
  }

  /**
   * Delete a service request.
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    return db.deleteServiceRequest(id);
  }

  /**
   * Add a comment to a service request.
   */
  async addComment(
    requestId: string,
    authorId: string,
    authorRole: "citizen" | "staff" | "admin",
    content: string
  ): Promise<Comment> {
    const db = getDatabase();
    return db.createComment({
      requestId,
      authorId,
      authorRole,
      content,
    });
  }

  /**
   * Get comments for a service request.
   */
  async getComments(requestId: string): Promise<Comment[]> {
    const db = getDatabase();
    return db.getCommentsByRequest(requestId);
  }

  /**
   * Add an attachment to a service request.
   */
  async addAttachment(
    requestId: string,
    uploadedBy: string,
    filename: string,
    contentType: string,
    size: number,
    blobUrl?: string
  ): Promise<Attachment> {
    const db = getDatabase();
    return db.createAttachment({
      requestId,
      uploadedBy,
      filename,
      contentType,
      size,
      blobUrl,
    });
  }

  /**
   * Get attachments for a service request.
   */
  async getAttachments(requestId: string): Promise<Attachment[]> {
    const db = getDatabase();
    return db.getAttachmentsByRequest(requestId);
  }

  /**
   * Create a notification.
   */
  async createNotification(
    recipientId: string,
    type: "status-change" | "new-comment" | "assignment",
    message: string,
    relatedRequestId?: string
  ): Promise<Notification> {
    const db = getDatabase();
    return db.createNotification({
      recipientId,
      type,
      message,
      relatedRequestId,
    });
  }

  /**
   * Get notifications for a user.
   */
  async getNotifications(recipientId: string): Promise<Notification[]> {
    const db = getDatabase();
    return db.getNotificationsByRecipient(recipientId);
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const db = getDatabase();
    return db.markNotificationAsRead(id);
  }
}

// Export a singleton instance
export const serviceRequestRepository = new ServiceRequestRepository();
