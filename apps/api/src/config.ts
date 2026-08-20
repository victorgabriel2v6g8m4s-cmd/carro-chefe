import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function boundedNumber(input: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(input ?? fallback);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

export function isLoopbackHost(host: string) {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host.trim().toLowerCase());
}

export function assertLoopbackBinding(host: string) {
  if (!isLoopbackHost(host)) {
    throw new Error("Exposição externa bloqueada: a API ainda não possui autenticação server-side. Use HOST=127.0.0.1.");
  }
}

export const config = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 4173),
  projectRoot: path.resolve(here, "../../.."),
  defaultUserId: process.env.DEFAULT_USER_ID ?? "owner",
  webhookSecret: process.env.WEBHOOK_SECRET ?? null,
  agentApiKey: process.env.AGENT_API_KEY ?? null,
  allowedCorsOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
  outboundWebhookTimeoutMs: boundedNumber(process.env.OUTBOUND_WEBHOOK_TIMEOUT_MS, 10_000, 1_000, 30_000),
  maxAgentConcurrency: Math.max(1, Math.min(6, Number(process.env.MAX_AGENT_CONCURRENCY ?? 3)))
};
