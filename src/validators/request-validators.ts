/**
 * Zod validation schemas for service request API.
 */

import { z } from "zod";

export const serviceRequestStatusSchema = z.enum(["pending", "in-progress", "resolved", "closed"]);

export const serviceRequestPrioritySchema = z.enum(["low", "medium", "high"]);

export const createServiceRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be at most 5000 characters"),
  priority: serviceRequestPrioritySchema.default("medium"),
});

export const updateServiceRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be at most 5000 characters")
    .optional(),
  priority: serviceRequestPrioritySchema.optional(),
});

export const updateStatusSchema = z.object({
  status: serviceRequestStatusSchema,
  reason: z
    .string()
    .max(1000, "Reason must be at most 1000 characters")
    .optional(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(2000, "Comment must be at most 2000 characters"),
});

export const listRequestsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1))
    .optional()
    .default(1),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),
  status: serviceRequestStatusSchema.optional(),
  priority: serviceRequestPrioritySchema.optional(),
});

export const attachmentSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must be at most 255 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Filename contains invalid characters"),
  contentType: z
    .string()
    .refine(
      (ct) => ["image/jpeg", "image/png", "application/pdf", "text/plain"].includes(ct),
      "Invalid content type"
    ),
  size: z
    .number()
    .min(1, "File size must be positive")
    .max(10 * 1024 * 1024, "File size must be at most 10MB"),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
export type AttachmentInput = z.infer<typeof attachmentSchema>;
