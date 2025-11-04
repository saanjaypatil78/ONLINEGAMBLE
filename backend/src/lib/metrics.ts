import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { config } from "../config";

const registry = new Registry();
registry.setDefaultLabels({
  service: "matka-backend",
  env: config.NODE_ENV,
  namespace: config.OBSERVABILITY_NAMESPACE,
});

if (config.ENABLE_PROMETHEUS_METRICS) {
  collectDefaultMetrics({
    register: registry,
    prefix: `${config.OBSERVABILITY_NAMESPACE}_`,
  });
}

const complianceEventsCounter = new Counter({
  name: `${config.OBSERVABILITY_NAMESPACE}_compliance_events_total`,
  help: "Total compliance events ingested, labelled by type.",
  labelNames: ["type"],
  registers: [registry],
});

const matchmakingQueueGauge = new Gauge({
  name: `${config.OBSERVABILITY_NAMESPACE}_matchmaking_queue_size`,
  help: "Current size of the matchmaking queue.",
  registers: [registry],
});

const httpRequestDurationHistogram = new Histogram({
  name: `${config.OBSERVABILITY_NAMESPACE}_http_request_duration_ms`,
  help: "HTTP request duration histogram in milliseconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
  registers: [registry],
});

export const recordComplianceEvent = (type: string) => {
  complianceEventsCounter.inc({ type });
};

export const setMatchmakingQueueSize = (size: number) => {
  matchmakingQueueGauge.set(size);
};

export const observeHttpRequest = (
  method: string,
  route: string,
  statusCode: number,
  durationMs: number,
) => {
  httpRequestDurationHistogram.observe(
    { method, route, status_code: String(statusCode) },
    durationMs,
  );
};

export const getMetricsSnapshot = async (): Promise<string> => registry.metrics();

export const metricsContentType = registry.contentType;

export const isMetricsEnabled = (): boolean => config.ENABLE_PROMETHEUS_METRICS;

// TODO: Integrate OpenTelemetry exporters once collector endpoints are provisioned.
