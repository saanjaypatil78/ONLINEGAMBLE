import pino from "pino";
import { config } from "../config";

const baseOptions = {
  level: config.LOG_LEVEL,
  transport: config.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    env: config.NODE_ENV,
    service: "matka-backend",
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
};

export const logger = pino(baseOptions);

export type AppLogger = ReturnType<typeof logger.child>;

export const createLogger = (bindings: Record<string, unknown>): AppLogger =>
  logger.child({ ...bindings });

export const httpLogger = createLogger({ channel: "http" });
export const battleLogger = createLogger({ channel: "battle" });
export const pumpfunLogger = createLogger({ channel: "pumpfun" });
export const complianceLogger = createLogger({ channel: "compliance" });

// TODO: Emit logs into centralized collector (e.g., Loki/ELK) once observability stack is provisioned.
