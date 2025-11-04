import { Router, Request, Response } from "express";

export const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    // TODO: include build metadata and dependency versions
  });
});
