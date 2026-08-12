import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 4173),
  projectRoot: path.resolve(here, "../../.."),
  defaultUserId: process.env.DEFAULT_USER_ID ?? "owner",
  webhookSecret: process.env.WEBHOOK_SECRET ?? null,
  agentApiKey: process.env.AGENT_API_KEY ?? null,
  maxAgentConcurrency: Math.max(1, Math.min(6, Number(process.env.MAX_AGENT_CONCURRENCY ?? 3))),
  productionAuthReady: process.env.PRODUCTION_AUTH_READY === "true"
};
