/**
 * Test setup file - initializes the mock database for all tests.
 */

import { setDatabase, type DatabaseInterface } from "../../src/lib/database.js";
import {
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
} from "./mock-db.js";

// Create the mock database implementation
const mockDatabase: DatabaseInterface = {
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

// Initialize the mock database before tests run
setDatabase(mockDatabase);
