import { config } from "../config";
import { logger } from "../lib/logger";
import { createId } from "../lib/id";
import { isMetricsEnabled, setMatchmakingQueueSize } from "../lib/metrics";

export interface QueuePlayer {
  playerPublicKey: string;
  petMint?: string;
  enqueuedAt: number;
}

export interface MatchAssignment {
  matchId: string;
  players: [QueuePlayer, QueuePlayer];
  createdAt: number;
}

type PlayerStatus =
  | {
      state: "queued";
      enqueuedAt: number;
      estimatedWaitSeconds: number | null;
    }
  | {
      state: "matched";
      match: MatchAssignment;
    }
  | {
      state: "none";
    };

const queueTtlMs = config.MATCHMAKING_QUEUE_TTL_SECONDS * 1000;

export class MatchmakingQueue {
  private readonly queue: QueuePlayer[] = [];
  private readonly matches = new Map<string, MatchAssignment>();
  private readonly playerMatchMap = new Map<string, MatchAssignment>();

  enqueue(playerPublicKey: string, petMint?: string): PlayerStatus {
    this.evictExpired();
    const existingMatch = this.playerMatchMap.get(playerPublicKey);
    if (existingMatch) {
      return { state: "matched", match: existingMatch };
    }

    const alreadyQueued = this.queue.find((entry) => entry.playerPublicKey === playerPublicKey);
    if (alreadyQueued) {
      return {
        state: "queued",
        enqueuedAt: alreadyQueued.enqueuedAt,
        estimatedWaitSeconds: this.estimateWaitSeconds(),
      };
    }

    const player: QueuePlayer = {
      playerPublicKey,
      petMint,
      enqueuedAt: Date.now(),
    };
    this.queue.push(player);
    this.emitQueueSize();
    logger.info({ playerPublicKey }, "Player enqueued for matchmaking");

    if (this.queue.length >= 2) {
      this.createMatch();
    }

    return {
      state: "queued",
      enqueuedAt: player.enqueuedAt,
      estimatedWaitSeconds: this.estimateWaitSeconds(),
    };
  }

  cancel(playerPublicKey: string): boolean {
    this.evictExpired();
    const index = this.queue.findIndex((entry) => entry.playerPublicKey === playerPublicKey);
    if (index >= 0) {
      this.queue.splice(index, 1);
      logger.info({ playerPublicKey }, "Player removed from matchmaking queue");
      this.emitQueueSize();
      return true;
    }
    return false;
  }

  getStatus(playerPublicKey: string): PlayerStatus {
    this.evictExpired();
    const existingMatch = this.playerMatchMap.get(playerPublicKey);
    if (existingMatch) {
      return { state: "matched", match: existingMatch };
    }
    const queued = this.queue.find((entry) => entry.playerPublicKey === playerPublicKey);
    if (queued) {
      return {
        state: "queued",
        enqueuedAt: queued.enqueuedAt,
        estimatedWaitSeconds: this.estimateWaitSeconds(),
      };
    }
    return { state: "none" };
  }

  acknowledgeMatch(playerPublicKey: string): MatchAssignment | null {
    const match = this.playerMatchMap.get(playerPublicKey);
    if (!match) {
      return null;
    }
    const allAcknowledged = match.players.every(
      (player) => this.playerMatchMap.get(player.playerPublicKey)?.matchId === match.matchId,
    );
    if (allAcknowledged) {
      this.matches.delete(match.matchId);
    }
    this.playerMatchMap.delete(playerPublicKey);
    return match;
  }

  private createMatch(): void {
    if (this.queue.length < 2) {
      return;
    }
    const playerA = this.queue.shift();
    const playerB = this.queue.shift();
    if (!playerA || !playerB) {
      return;
    }
    const match: MatchAssignment = {
      matchId: createId("match"),
      players: [playerA, playerB],
      createdAt: Date.now(),
    };

    this.matches.set(match.matchId, match);
    this.playerMatchMap.set(playerA.playerPublicKey, match);
    this.playerMatchMap.set(playerB.playerPublicKey, match);
    this.emitQueueSize();

    logger.info(
      { matchId: match.matchId, players: match.players.map((p) => p.playerPublicKey) },
      "Matchmaking pair created",
    );
  }

  private estimateWaitSeconds(): number | null {
    if (this.queue.length < 2) {
      return null;
    }
    // Simple heuristic: assume one match every 10 seconds when queue is active.
    return Math.ceil((this.queue.length / 2) * 10);
  }

  private evictExpired(): void {
    const cutoff = Date.now() - queueTtlMs;
    while (this.queue.length > 0 && this.queue[0].enqueuedAt < cutoff) {
      const expired = this.queue.shift();
      if (expired) {
        logger.warn(
          { playerPublicKey: expired.playerPublicKey },
          "Evicted expired matchmaking entry",
        );
      }
    }
    this.emitQueueSize();
  }

  private emitQueueSize(): void {
    if (!isMetricsEnabled()) {
      return;
    }
    setMatchmakingQueueSize(this.queue.length);
  }
}

export const matchmakingQueue = new MatchmakingQueue();

// TODO: swap with Redis-backed queue and persistent match ledger for production.
