/**
 * Service Request Routes
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createRequest,
  listRequests,
  getRequest,
  updateRequest,
  updateStatus,
  deleteRequest,
} from "../controllers/request-controller.js";
import { addComment, getComments } from "../controllers/comment-controller.js";
import { uploadAttachment, getAttachments } from "../controllers/attachment-controller.js";

export const requestRouter = Router();

// All routes require authentication
requestRouter.use(authenticate);

// Request CRUD
requestRouter.post("/", createRequest);
requestRouter.get("/", listRequests);
requestRouter.get("/:id", getRequest);
requestRouter.patch("/:id", updateRequest);
requestRouter.patch("/:id/status", updateStatus);
requestRouter.delete("/:id", deleteRequest);

// Comments
requestRouter.post("/:requestId/comments", addComment);
requestRouter.get("/:requestId/comments", getComments);

// Attachments
requestRouter.post("/:requestId/attachments", uploadAttachment);
requestRouter.get("/:requestId/attachments", getAttachments);
