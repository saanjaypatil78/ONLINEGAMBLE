import { Request, Response, Router } from "express";
import { complianceAuditTrail, emitComplianceEvent } from "../middleware/complianceAuditTrail";
import { complianceMonitoringService } from "../services/complianceMonitoring";
import { complianceLogger } from "../lib/logger";
import { config } from "../config";

interface ComplianceWebhookRequest {
  eventType?: "approved" | "rejected" | "review";
  userId: string;
  remarks?: string;
  payload?: Record<string, unknown>;
}

interface AmlAlertRequest {
  alertCode: string;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string;
  payload?: Record<string, unknown>;
}

interface SuspiciousActivityRequest {
  subjectId: string;
  reason: string;
  channel?: string;
  payload?: Record<string, unknown>;
}

type BodyRequest<TBody> = Request<Record<string, never>, unknown, TBody | undefined>;

const router = Router();

router.use(complianceAuditTrail);

router.post("/kyc/webhook", async (req: BodyRequest<ComplianceWebhookRequest>, res: Response) => {
  const body = req.body ?? ({} as ComplianceWebhookRequest);
  const providedSecret = req.header("x-webhook-secret") ?? undefined;

  if (!body.userId) {
    res.status(400).json({ error: "missing_user_id" });
    return;
  }

  if (config.COMPLIANCE_WEBHOOK_SECRET && providedSecret !== config.COMPLIANCE_WEBHOOK_SECRET) {
    complianceLogger.warn({ userId: body.userId }, "Rejected KYC webhook due to invalid secret");
    res.status(401).json({ error: "invalid_webhook_secret" });
    return;
  }

  await emitComplianceEvent(
    "kyc_event",
    {
      userId: body.userId,
      eventType: body.eventType ?? "review",
      remarks: body.remarks,
      payload: body.payload,
    },
    req,
  );

  res.status(202).json({ status: "accepted" });
});

router.post("/aml/alerts", async (req: BodyRequest<AmlAlertRequest>, res: Response) => {
  const body = req.body ?? ({} as AmlAlertRequest);

  if (!body.alertCode) {
    res.status(400).json({ error: "missing_alert_code" });
    return;
  }

  await emitComplianceEvent(
    "aml_alert",
    {
      alertCode: body.alertCode,
      severity: body.severity ?? "medium",
      description: body.description,
      payload: body.payload,
    },
    req,
  );

  res.status(202).json({ status: "queued" });
});

router.post(
  "/flags/suspicious",
  async (req: BodyRequest<SuspiciousActivityRequest>, res: Response) => {
    const body = req.body ?? ({} as SuspiciousActivityRequest);

    if (!body.subjectId || !body.reason) {
      res.status(400).json({ error: "missing_required_fields" });
      return;
    }

    await emitComplianceEvent(
      "suspicious_activity",
      {
        subjectId: body.subjectId,
        reason: body.reason,
        channel: body.channel ?? "unknown",
        payload: body.payload,
      },
      req,
    );

    res.status(202).json({ status: "recorded" });
  },
);

router.get("/events/recent", (_req: Request, res: Response) => {
  const events = complianceMonitoringService.listRecentEvents();
  res.json({ events });
});

// TODO: add authenticated search endpoint for long-term storage once database integration lands.

export { router };
