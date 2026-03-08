/**
 * Shared type definitions for the service request API.
 */

export interface ServiceRequest {
  id: string;
  citizenId: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

export interface Comment {
  id: string;
  requestId: string;
  authorId: string;
  authorRole: "citizen" | "staff" | "admin";
  content: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  requestId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  blobUrl?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: "status-change" | "new-comment" | "assignment";
  message: string;
  read: boolean;
  createdAt: Date;
  relatedRequestId?: string;
}
