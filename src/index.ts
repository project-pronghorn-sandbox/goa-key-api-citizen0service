import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "dotenv";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";

config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "10kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/health", healthRouter);

// TODO: Add feature routes here (see GitHub Issues)

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 ${process.env.npm_package_name || "goa--key-api-citizen0service"} running on port ${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
