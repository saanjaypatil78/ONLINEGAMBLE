# Matka Backend Service

The backend provides REST APIs for matchmaking, compliance instrumentation, pump.fun integrations, and observability for the Matka Solana MVP.

## Key Endpoints

| Route | Description |
| --- | --- |
| `GET /` | Service metadata and observability entrypoint. |
| `GET /health` | Basic health probe with timestamp. |
| `POST /matchmaking/enqueue` | Submit a player to the matchmaking queue. |
| `POST /matchmaking/cancel` | Remove a player from the queue. |
| `POST /matchmaking/acknowledge` | Confirm a match assignment. |
| `POST /compliance/kyc/webhook` | Receives KYC webhook notifications. |
| `POST /compliance/aml/alerts` | Records AML alert payloads. |
| `POST /compliance/flags/suspicious` | Raises manual suspicious activity flags. |
| `GET /compliance/events/recent` | Retrieves the in-memory compliance event buffer. |
| `GET {METRICS_EXPORT_PATH}` | Prometheus metrics endpoint (defaults to `/observability/metrics`). |
| `GET {METRICS_EXPORT_PATH}/dashboards` | Placeholder metadata for dashboards/alerts. |

## Configuration

Copy `.env.example` to `.env` and review the following variables:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP server port (defaults to `4000`). |
| `LOG_LEVEL` | Pino log level (`info`, `debug`, `warn`, etc.). |
| `COMPLIANCE_STORAGE_URL` | Where compliance events are persisted (supports `file://`, stubs for `mongo://` and `postgres://`). |
| `COMPLIANCE_RECENT_EVENT_LIMIT` | Size of the in-memory recent compliance buffer. |
| `COMPLIANCE_WEBHOOK_SECRET` | Shared secret required for `/compliance/kyc/webhook`. |
| `ENABLE_PROMETHEUS_METRICS` | Toggle to enable Prometheus instrumentation (`true`/`false`). |
| `METRICS_EXPORT_PATH` | URL mount path for metrics router (default `/observability/metrics`). |
| `OBSERVABILITY_NAMESPACE` | Prefix for Prometheus metric names. |
| `OTEL_EXPORTER_ENDPOINT` | Placeholder for future OpenTelemetry collector integration. |

See [`src/config.ts`](src/config.ts:1) for the authoritative schema and defaults.

## Compliance Monitoring & Observability Flow

1. Incoming compliance requests pass through [`complianceAuditTrail`](src/middleware/complianceAuditTrail.ts:5), which logs structured metadata and attaches a request context.
2. Route handlers in [`routes/compliance.ts`](src/routes/compliance.ts:1) validate payloads and emit typed events (`kyc_event`, `aml_alert`, `suspicious_activity`).
3. [`ComplianceMonitoringService`](src/services/complianceMonitoring.ts:1) assigns an ID, persists to the configured sink, and maintains an in-memory ring buffer for `/compliance/events/recent`.
4. Sinks:
   - Structured log sink (`pino`) for centralized log collection.
   - File sink when `COMPLIANCE_STORAGE_URL` uses a `file://` scheme (ideal for local replay/testing).
   - Database integrations (Mongo/Postgres) are stubbed with TODOs for future implementation.
5. Metrics counters increment per event type via [`recordComplianceEvent`](src/lib/metrics.ts:1) when Prometheus is enabled.

All compliance-related logs flow through the [`complianceLogger`](src/lib/logger.ts:1) child logger, enabling targeted scrapes or log routing.

## Observability

- `prom-client` powers default and custom metrics via [`lib/metrics.ts`](src/lib/metrics.ts:1).
- HTTP requests are instrumented by [`httpMetricsMiddleware`](src/middleware/httpMetrics.ts:1) with histogram tracking of latency.
- Matchmaking queue depth updates through [`MatchmakingQueue.emitQueueSize`](src/services/matchmakingQueue.ts:1).
- Metrics are exposed under `METRICS_EXPORT_PATH`, returning `text/plain` Prometheus-compatible output.
- A dashboards placeholder endpoint is provided for infra teams to wire Grafana/Looker once available.
- OpenTelemetry exporter integration is left as a TODO pending infrastructure readiness.

## Development

```bash
# Install dependencies from monorepo root
npm install

# Run in watch mode
npm run dev --workspace backend

# Execute tests
npm run test --workspace backend

# Lint + type-check
npm run lint --workspace backend
npm run typecheck --workspace backend

# Build production bundle
npm run build --workspace backend
```

## TODOs

- Replace in-memory compliance buffer with persistent storage.
- Integrate SIEM/alerting destinations (e.g., Slack, PagerDuty) for high severity events.
- Wire OpenTelemetry exporters when collector endpoints are available.
- Consolidate type shims once upstream types are introduced.