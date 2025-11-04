import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),

  ANCHOR_PROVIDER_URL: z.string().url().default("https://api.devnet.solana.com"),
  ANCHOR_WALLET: z.string().min(1, "ANCHOR_WALLET is required").default("~/.config/solana/id.json"),
  ANCHOR_BATTLE_CORE_PROGRAM_ID: z
    .string()
    .min(1, "ANCHOR_BATTLE_CORE_PROGRAM_ID is required")
    .default("BtLCr1111111111111111111111111111111111111111"),
  ANCHOR_PAYOUT_VAULT_PROGRAM_ID: z
    .string()
    .min(1, "ANCHOR_PAYOUT_VAULT_PROGRAM_ID is required")
    .default("PytVlt1111111111111111111111111111111111111111"),

  PUMPFUN_API_URL: z.string().url().default("https://api.pump.fun"),
  PUMPFUN_TOKEN_MINT: z.string().min(1, "PUMPFUN_TOKEN_MINT is required").optional(),
  PUMPFUN_CACHE_TTL_MS: z.coerce.number().int().positive().default(15_000),

  MATCHMAKING_QUEUE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  COMPLIANCE_WEBHOOK_SECRET: z.string().optional(),
  COMPLIANCE_STORAGE_URL: z.string().default("file://./tmp/compliance-events.log"),
  COMPLIANCE_RECENT_EVENT_LIMIT: z.coerce.number().int().positive().default(50),
  ENABLE_PROMETHEUS_METRICS: z.coerce.boolean().default(true),
  METRICS_EXPORT_PATH: z.string().default("/observability/metrics"),
  OBSERVABILITY_NAMESPACE: z.string().default("matka"),
  OTEL_EXPORTER_ENDPOINT: z.string().url().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // TODO: route configuration errors through structured logger once bootstrap completes.
  console.error(
    "Failed to validate environment configuration",
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration");
}

const baseEnv = parsedEnv.data;

export const config = {
  ...baseEnv,
  isProduction: baseEnv.NODE_ENV === "production",
  isTest: baseEnv.NODE_ENV === "test",
  isDevelopment: baseEnv.NODE_ENV === "development",
  OBSERVABILITY_NAMESPACE: baseEnv.OBSERVABILITY_NAMESPACE,
  COMPLIANCE_STORAGE_URL: baseEnv.COMPLIANCE_STORAGE_URL,
  COMPLIANCE_RECENT_EVENT_LIMIT: baseEnv.COMPLIANCE_RECENT_EVENT_LIMIT,
  ENABLE_PROMETHEUS_METRICS: baseEnv.ENABLE_PROMETHEUS_METRICS,
  METRICS_EXPORT_PATH: baseEnv.METRICS_EXPORT_PATH,
  OTEL_EXPORTER_ENDPOINT: baseEnv.OTEL_EXPORTER_ENDPOINT,
} as const;

export type AppConfig = typeof config;

// TODO: replace default-based fallbacks with secret manager integration before production hardening.
