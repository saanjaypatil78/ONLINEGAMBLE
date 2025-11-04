import type { NextFunction, Request, Response } from "express";
import { httpLogger } from "../lib/logger";
import { isMetricsEnabled, observeHttpRequest } from "../lib/metrics";

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!isMetricsEnabled()) {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const route = req.route?.path ?? req.originalUrl ?? req.url ?? "unknown";
    observeHttpRequest(req.method, route, res.statusCode, durationMs);
    httpLogger.debug(
      {
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationMs,
      },
      "Recorded HTTP metrics",
    );
  });

  next();
};
// TODO: add histogram buckets customization via configuration if required.
