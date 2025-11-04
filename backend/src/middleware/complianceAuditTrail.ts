import type { NextFunction, Request, Response } from "express";
import { complianceMonitoringService, ComplianceEventType } from "../services/complianceMonitoring";
import { complianceLogger } from "../lib/logger";

export interface ComplianceContext {
  requestId?: string;
  correlationId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    complianceContext?: ComplianceContext;
  }
}

const coerceHeader = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

export const complianceAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = coerceHeader(req.headers["x-request-id"]);
  const correlationId = coerceHeader(req.headers["x-correlation-id"]);

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    complianceLogger.info(
      {
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: res.statusCode,
        durationMs,
        requestId,
        correlationId,
      },
      "Compliance route processed",
    );
  });

  req.complianceContext = {
    requestId,
    correlationId,
  };

  next();
};

export const emitComplianceEvent = async (
  type: ComplianceEventType,
  payload: Record<string, unknown>,
  req: Request,
) => {
  const metadata = {
    requestId: req.complianceContext?.requestId,
    correlationId: req.complianceContext?.correlationId,
    remoteAddress: req.ip,
    userAgent: req.get("user-agent"),
  };

  switch (type) {
    case "kyc_event": {
      await complianceMonitoringService.recordKycEvent(payload, metadata);
      break;
    }
    case "aml_alert": {
      await complianceMonitoringService.recordAmlAlert(payload, metadata);
      break;
    }
    case "suspicious_activity": {
      await complianceMonitoringService.recordSuspiciousActivity(payload, metadata);
      break;
    }
    default: {
      complianceLogger.warn({ type }, "Unknown compliance event type");
    }
  }
};
// TODO: extend middleware with explicit authZ checks and rate limiting before production rollout.
