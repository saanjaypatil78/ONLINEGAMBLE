import { Router } from "express";
import type { Request, Response } from "express";
import { getMetricsSnapshot, isMetricsEnabled, metricsContentType } from "../lib/metrics";
import { logger } from "../lib/logger";

const router = Router();

router.get("/metrics", async (_req: Request, res: Response) => {
  if (!isMetricsEnabled()) {
    res.status(503).json({ error: "metrics_disabled" });
    return;
  }

  try {
    const body = await getMetricsSnapshot();
    res.setHeader("Content-Type", metricsContentType);
    res.send(body);
  } catch (err) {
    logger.error({ err }, "Failed to generate metrics snapshot");
    res.status(500).json({ error: "metrics_generation_failed" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  if (!isMetricsEnabled()) {
    res.status(503).json({ error: "metrics_disabled" });
    return;
  }

  try {
    const body = await getMetricsSnapshot();
    res.setHeader("Content-Type", metricsContentType);
    res.send(body);
  } catch (err) {
    logger.error({ err }, "Failed to generate metrics snapshot");
    res.status(500).json({ error: "metrics_generation_failed" });
  }
});

router.get("/dashboards", (_req: Request, res: Response) => {
  res.json({
    status: "todo",
    message:
      "Dashboards are provisioned via infra/observability dashboards once Grafana or Looker integration is connected.",
  });
});

export { router };
