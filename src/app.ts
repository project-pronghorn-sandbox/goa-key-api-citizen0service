/**
 * Express application factory for testing and production.
 * Separates app configuration from server startup.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { requestRouter } from "./routes/requests.js";
import { notificationRouter } from "./routes/notifications.js";

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
  app.use(express.json({ limit: "10kb" }));
  
  // Only apply rate limiting in production
  if (process.env.NODE_ENV !== "test") {
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));
  }

  // Routes
  app.use("/health", healthRouter);
  app.use("/api/requests", requestRouter);
  app.use("/api/notifications", notificationRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
