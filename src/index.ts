import { config } from "dotenv";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";

config();

const app = createApp();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Request logging (only in non-test environment)
if (process.env.NODE_ENV !== "test") {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
}

app.listen(PORT, () => {
  logger.info(`🚀 ${process.env.npm_package_name || "goa--key-api-citizen0service"} running on port ${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
