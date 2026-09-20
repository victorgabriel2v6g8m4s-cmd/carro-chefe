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
    throw new Error("Exposição externa bloqueada enquanto não existir autenticação server-side; mantenha a API em loopback e publique somente pelo reverse proxy controlado.");
  }
}

const defaultCorsOrigins = [
  "https://carrochefe.com",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4173",
  "http://localhost:4174",
  "http://127.0.0.1:5175",
  "http://localhost:5175"
].join(",");

export const config = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 4173),
  projectRoot: path.resolve(here, "../../.."),
  defaultUserId: process.env.DEFAULT_USER_ID ?? "owner",
  webhookSecret: process.env.WEBHOOK_SECRET ?? null,
  agentApiKey: process.env.AGENT_API_KEY ?? null,
  allowedCorsOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? defaultCorsOrigins).split(",").map((origin) => origin.trim()).filter(Boolean),
  outboundWebhookTimeoutMs: boundedNumber(process.env.OUTBOUND_WEBHOOK_TIMEOUT_MS, 10_000, 1_000, 30_000),
  maxAgentConcurrency: Math.max(1, Math.min(6, Number(process.env.MAX_AGENT_CONCURRENCY ?? 3))),
  productionAuthReady: process.env.PRODUCTION_AUTH_READY === "true",
  trustProxy: process.env.TRUST_PROXY === "true"
};
