import { promises as fs } from "fs";
import path from "path";
import { URL } from "url";
import { config } from "../config";
import { createId } from "../lib/id";
import { complianceLogger } from "../lib/logger";
import { isMetricsEnabled, recordComplianceEvent } from "../lib/metrics";

export type ComplianceEventType = "kyc_event" | "aml_alert" | "suspicious_activity";

export interface ComplianceEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: ComplianceEventType;
  payload: TPayload;
  tags?: string[];
  occurredAt: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceEventSink {
  ingest(event: ComplianceEvent): Promise<void>;
}

class StructuredLogComplianceSink implements ComplianceEventSink {
  async ingest(event: ComplianceEvent): Promise<void> {
    complianceLogger.info({ event }, "Compliance event ingested");
  }
}

class FileComplianceSink implements ComplianceEventSink {
  private readonly filePath: string;

  constructor(fileUrl: URL) {
    this.filePath = fileUrl.protocol === "file:" ? fileUrl.pathname : fileUrl.toString();
  }

  async ingest(event: ComplianceEvent): Promise<void> {
    const line = JSON.stringify(event);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${line}\n`, { encoding: "utf-8" });
  }
}

class NullComplianceSink implements ComplianceEventSink {
  async ingest(event: ComplianceEvent): Promise<void> {
    complianceLogger.warn({ event }, "Compliance sink not configured, dropping event");
  }
}

const createSink = (storageUrl: string | undefined): ComplianceEventSink => {
  if (!storageUrl) {
    return new NullComplianceSink();
  }

  try {
    const parsed = new URL(storageUrl);
    if (parsed.protocol === "file:") {
      return new FileComplianceSink(parsed);
    }

    if (parsed.protocol.startsWith("mongo") || parsed.protocol.startsWith("postgres")) {
      // TODO: Implement Mongo/Postgres-backed sink once infrastructure is ready.
      complianceLogger.info(
        { storageUrl: parsed.toString(), protocol: parsed.protocol },
        "Compliance sink configured for database integration (stub only)",
      );
      return new StructuredLogComplianceSink();
    }

    complianceLogger.warn(
      { storageUrl, protocol: parsed.protocol },
      "Unsupported compliance storage protocol, defaulting to structured log sink",
    );
    return new StructuredLogComplianceSink();
  } catch (err) {
    complianceLogger.error({ err, storageUrl }, "Failed to parse compliance storage URL");
    return new NullComplianceSink();
  }
};

export class ComplianceMonitoringService {
  private readonly sink: ComplianceEventSink;
  private readonly recentEvents: ComplianceEvent[] = [];

  constructor(sink: ComplianceEventSink) {
    this.sink = sink;
  }

  async recordKycEvent(payload: Record<string, unknown>, metadata?: Record<string, unknown>) {
    await this.ingest("kyc_event", payload, metadata);
  }

  async recordAmlAlert(payload: Record<string, unknown>, metadata?: Record<string, unknown>) {
    await this.ingest("aml_alert", payload, metadata);
  }

  async recordSuspiciousActivity(
    payload: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ) {
    await this.ingest("suspicious_activity", payload, metadata);
  }

  listRecentEvents(): ComplianceEvent[] {
    return [...this.recentEvents];
  }

  private async ingest(
    type: ComplianceEventType,
    payload: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ) {
    const complianceEvent: ComplianceEvent = {
      id: createId("cmp"),
      type,
      payload,
      occurredAt: new Date().toISOString(),
      metadata,
    };

    this.pushRecent(complianceEvent);
    if (isMetricsEnabled()) {
      recordComplianceEvent(type);
    }
    await this.sink.ingest(complianceEvent);
  }

  private pushRecent(event: ComplianceEvent) {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > config.COMPLIANCE_RECENT_EVENT_LIMIT) {
      this.recentEvents.pop();
    }
  }
}

const complianceMonitoringService = new ComplianceMonitoringService(
  createSink(config.COMPLIANCE_STORAGE_URL),
);

export { complianceMonitoringService };
// TODO: Wire this service into message queues and SIEM once enterprise-grade observability is provisioned.
