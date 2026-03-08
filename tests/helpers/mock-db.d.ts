/**
 * In-memory database mock for testing repository methods.
 * Simulates basic CRUD operations with service requests.
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
export interface MockDatabase {
    serviceRequests: Map<string, ServiceRequest>;
    comments: Map<string, Comment>;
    attachments: Map<string, Attachment>;
    notifications: Map<string, Notification>;
}
/**
 * Initialize or reset the mock database.
 */
export declare function initMockDb(): MockDatabase;
/**
 * Get the current mock database instance.
 */
export declare function getMockDb(): MockDatabase;
/**
 * Clear all data from the mock database.
 */
export declare function clearMockDb(): void;
/**
 * Generate a unique ID for mock database records.
 */
export declare function generateId(prefix?: string): string;
export declare function createServiceRequest(data: Omit<ServiceRequest, "id" | "createdAt" | "updatedAt">): ServiceRequest;
export declare function getServiceRequestById(id: string): ServiceRequest | undefined;
export declare function getServiceRequestsByCitizen(citizenId: string): ServiceRequest[];
export declare function getAllServiceRequests(): ServiceRequest[];
export declare function updateServiceRequest(id: string, updates: Partial<Omit<ServiceRequest, "id" | "createdAt">>): ServiceRequest | undefined;
export declare function deleteServiceRequest(id: string): boolean;
export declare function createComment(data: Omit<Comment, "id" | "createdAt">): Comment;
export declare function getCommentsByRequest(requestId: string): Comment[];
export declare function getCommentById(id: string): Comment | undefined;
export declare function deleteComment(id: string): boolean;
export declare function createAttachment(data: Omit<Attachment, "id" | "uploadedAt">): Attachment;
export declare function getAttachmentsByRequest(requestId: string): Attachment[];
export declare function getAttachmentById(id: string): Attachment | undefined;
export declare function deleteAttachment(id: string): boolean;
export declare function createNotification(data: Omit<Notification, "id" | "createdAt" | "read">): Notification;
export declare function getNotificationsByRecipient(recipientId: string): Notification[];
export declare function markNotificationAsRead(id: string): Notification | undefined;
export declare function deleteNotification(id: string): boolean;
export declare function seedTestData(): void;
//# sourceMappingURL=mock-db.d.ts.map