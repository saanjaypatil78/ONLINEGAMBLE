import type { ErrorRequestHandler, Request, Response } from "express";
import { logger } from "../lib/logger";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: "not_found",
    message: "The requested resource could not be located",
    path: req.originalUrl ?? req.url ?? "unknown",
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = err.statusCode ?? 500;

  logger.error(
    {
      err,
      statusCode,
      path: req.originalUrl ?? req.url ?? "unknown",
    },
    "Unhandled error occurred while processing request",
  );

  res.status(statusCode).json({
    error: err.name || "internal_error",
    message: err.message || "An unexpected error occurred",
    statusCode,
  });
};

// TODO: Extend error typing to propagate domain-specific metadata once services mature.
