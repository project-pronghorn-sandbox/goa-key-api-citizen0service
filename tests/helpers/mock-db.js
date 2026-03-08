/**
 * In-memory database mock for testing repository methods.
 * Simulates basic CRUD operations with service requests.
 */
let db;
/**
 * Initialize or reset the mock database.
 */
export function initMockDb() {
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
export function getMockDb() {
    if (!db) {
        return initMockDb();
    }
    return db;
}
/**
 * Clear all data from the mock database.
 */
export function clearMockDb() {
    initMockDb();
}
/**
 * Generate a unique ID for mock database records.
 */
export function generateId(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
// Service Request Operations
export function createServiceRequest(data) {
    const db = getMockDb();
    const request = {
        ...data,
        id: generateId("sr"),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    db.serviceRequests.set(request.id, request);
    return request;
}
export function getServiceRequestById(id) {
    return getMockDb().serviceRequests.get(id);
}
export function getServiceRequestsByCitizen(citizenId) {
    const db = getMockDb();
    return Array.from(db.serviceRequests.values()).filter((r) => r.citizenId === citizenId);
}
export function getAllServiceRequests() {
    return Array.from(getMockDb().serviceRequests.values());
}
export function updateServiceRequest(id, updates) {
    const db = getMockDb();
    const existing = db.serviceRequests.get(id);
    if (!existing)
        return undefined;
    // Filter out undefined values to preserve existing fields
    const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([_, value]) => value !== undefined));
    const updated = {
        ...existing,
        ...filteredUpdates,
        updatedAt: new Date(),
    };
    db.serviceRequests.set(id, updated);
    return updated;
}
export function deleteServiceRequest(id) {
    return getMockDb().serviceRequests.delete(id);
}
// Comment Operations
export function createComment(data) {
    const db = getMockDb();
    const comment = {
        ...data,
        id: generateId("c"),
        createdAt: new Date(),
    };
    db.comments.set(comment.id, comment);
    return comment;
}
export function getCommentsByRequest(requestId) {
    const db = getMockDb();
    return Array.from(db.comments.values()).filter((c) => c.requestId === requestId);
}
export function getCommentById(id) {
    return getMockDb().comments.get(id);
}
export function deleteComment(id) {
    return getMockDb().comments.delete(id);
}
// Attachment Operations
export function createAttachment(data) {
    const db = getMockDb();
    const attachment = {
        ...data,
        id: generateId("a"),
        uploadedAt: new Date(),
    };
    db.attachments.set(attachment.id, attachment);
    return attachment;
}
export function getAttachmentsByRequest(requestId) {
    const db = getMockDb();
    return Array.from(db.attachments.values()).filter((a) => a.requestId === requestId);
}
export function getAttachmentById(id) {
    return getMockDb().attachments.get(id);
}
export function deleteAttachment(id) {
    return getMockDb().attachments.delete(id);
}
// Notification Operations
export function createNotification(data) {
    const db = getMockDb();
    const notification = {
        ...data,
        id: generateId("n"),
        read: false,
        createdAt: new Date(),
    };
    db.notifications.set(notification.id, notification);
    return notification;
}
export function getNotificationsByRecipient(recipientId) {
    const db = getMockDb();
    return Array.from(db.notifications.values()).filter((n) => n.recipientId === recipientId);
}
export function markNotificationAsRead(id) {
    const db = getMockDb();
    const notification = db.notifications.get(id);
    if (!notification)
        return undefined;
    notification.read = true;
    db.notifications.set(id, notification);
    return notification;
}
export function deleteNotification(id) {
    return getMockDb().notifications.delete(id);
}
// Seed data for testing
export function seedTestData() {
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
//# sourceMappingURL=mock-db.js.map