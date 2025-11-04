import { Router, Request, Response } from "express";
import { matchmakingQueue } from "../services/matchmakingQueue";
import { logger } from "../lib/logger";

interface EnqueueRequestBody {
  playerPublicKey: string;
  petMint?: string;
}

const router = Router();

const resolveRequestId = (req: Request): string => {
  const contextualId = (req as unknown as { id?: string }).id;
  if (typeof contextualId === "string" && contextualId.length > 0) {
    return contextualId;
  }

  const rawHeaders = (req as unknown as { headers?: Record<string, unknown> }).headers;
  const headerValue = rawHeaders?.["x-request-id"];

  if (typeof headerValue === "string" && headerValue.length > 0) {
    return headerValue;
  }

  if (Array.isArray(headerValue) && typeof headerValue[0] === "string") {
    return headerValue[0];
  }

  return "unknown";
};

router.post("/enqueue", (req: Request, res: Response) => {
  const body = req.body as EnqueueRequestBody | undefined;

  if (!body?.playerPublicKey) {
    res.status(400).json({ error: "playerPublicKey is required" });
    return;
  }

  logger.debug(
    { requestId: resolveRequestId(req), body },
    "Received matchmaking enqueue request payload",
  );
  const status = matchmakingQueue.enqueue(body.playerPublicKey, body.petMint);

  res.json({
    playerPublicKey: body.playerPublicKey,
    status: status.state,
    enqueuedAt: status.state === "queued" ? status.enqueuedAt : undefined,
    estimatedWaitSeconds: status.state === "queued" ? status.estimatedWaitSeconds : undefined,
    match: status.state === "matched" ? status.match : undefined,
  });
});

router.post("/cancel", (req: Request, res: Response) => {
  const body = req.body as EnqueueRequestBody | undefined;

  if (!body?.playerPublicKey) {
    res.status(400).json({ error: "playerPublicKey is required" });
    return;
  }

  logger.debug(
    { requestId: resolveRequestId(req), body },
    "Received matchmaking cancel request payload",
  );
  const removed = matchmakingQueue.cancel(body.playerPublicKey);
  if (!removed) {
    res.status(404).json({ error: "Player not found in queue" });
    return;
  }

  res.json({
    playerPublicKey: body.playerPublicKey,
    status: "cancelled",
  });
});

router.get("/status/:playerPublicKey", (req: Request, res: Response) => {
  const { playerPublicKey } = req.params;
  const status = matchmakingQueue.getStatus(playerPublicKey);
  logger.debug(
    { requestId: resolveRequestId(req), playerPublicKey, status },
    "Computed matchmaking status response",
  );

  res.json({
    playerPublicKey,
    status: status.state,
    enqueuedAt: status.state === "queued" ? status.enqueuedAt : undefined,
    estimatedWaitSeconds: status.state === "queued" ? status.estimatedWaitSeconds : undefined,
    match: status.state === "matched" ? status.match : undefined,
  });
});

router.post("/acknowledge", (req: Request, res: Response) => {
  const body = req.body as EnqueueRequestBody | undefined;

  if (!body?.playerPublicKey) {
    res.status(400).json({ error: "playerPublicKey is required" });
    return;
  }

  logger.debug(
    { requestId: resolveRequestId(req), body },
    "Received matchmaking acknowledgement payload",
  );
  const match = matchmakingQueue.acknowledgeMatch(body.playerPublicKey);
  if (!match) {
    res.status(404).json({ error: "No match found for player" });
    return;
  }

  logger.info(
    { matchId: match.matchId, playerPublicKey: body.playerPublicKey },
    "Match acknowledged by player",
  );

  res.json({
    playerPublicKey: body.playerPublicKey,
    match,
    status: "acknowledged",
  });
});

export { router };
