import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config";
import { logger, httpLogger } from "./lib/logger";
import { router as healthRouter } from "./routes/health";
import { router as matchmakingRouter } from "./routes/matchmaking";
import { router as complianceRouter } from "./routes/compliance";
import { router as observabilityRouter } from "./routes/observability";
import { notFoundHandler, errorHandler } from "./middleware/errorHandlers";
import packageJson from "../package.json";
import { httpMetricsMiddleware } from "./middleware/httpMetrics";

const { version } = packageJson as { version: string };

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    logger: httpLogger,
    autoLogging: true,
    customLogLevel: (_req, res, err) => {
      if (err) {
        return "error";
      }
      if (res.statusCode >= 500) {
        return "error";
      }
      if (res.statusCode >= 400) {
        return "warn";
      }
      return "info";
    },
  }),
);
app.use(httpMetricsMiddleware);

app.get("/", (_req, res) => {
  res.json({
    service: "matka-backend",
    version,
    status: "ok",
    environment: config.NODE_ENV,
    documentation: "/health",
    observability: config.METRICS_EXPORT_PATH,
  });
});

app.use("/health", healthRouter);
app.use("/matchmaking", matchmakingRouter);
app.use("/compliance", complianceRouter);
app.use(config.METRICS_EXPORT_PATH, observabilityRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, version }, "HTTP server listening");
});

export { app };
