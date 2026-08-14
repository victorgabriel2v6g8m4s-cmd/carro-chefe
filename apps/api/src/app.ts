import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { configureSqlite } from "@carro-chefe/database";
import { ApiError } from "./lib/errors";
import { planRoutes } from "./modules/plan/routes";
import { taskRoutes } from "./modules/tasks/routes";
import { uiStateRoutes } from "./modules/ui-state/routes";
import { agentRoutes } from "./modules/agents/routes";
import { eventRoutes } from "./modules/events/routes";
import { webhookRoutes } from "./modules/webhooks/routes";
import { uploadRoutes } from "./modules/uploads/routes";
import { intentRoutes } from "./modules/intents/routes";
import { governanceRoutes } from "./modules/governance/routes";
import { browserRoutes } from "./modules/browser/routes";
import { containsLikelyEncodingLoss } from "./lib/text";

declare module "fastify" {
  interface FastifyRequest { rawBody?: string }
}

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test", bodyLimit: 16 * 1024 * 1024 });
  await configureSqlite();
  await app.register(cors, { origin: process.env.NODE_ENV === "production" ? false : true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 8 } });
  await app.register(rateLimit, {
    global: true,
    max: process.env.NODE_ENV === "test" ? 100_000 : 600,
    timeWindow: "1 minute",
    errorResponseBuilder: (_request, context) => ({ statusCode: 429, error: "Muitas solicitações", message: `Limite excedido. Tente novamente em ${context.after}.` })
  });

  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    request.rawBody = body as string;
    try { done(null, body ? JSON.parse(body as string) : {}); }
    catch { done(new ApiError(400, "JSON inválido."), undefined); }
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "SAMEORIGIN");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });

  app.addHook("preValidation", async (request) => {
    if (containsLikelyEncodingLoss(request.body)) {
      throw new ApiError(400, "Texto recebido com perda de codificação. Reenvie o JSON como UTF-8.", { code: "ENCODING_CORRUPTED" });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "Entrada inválida.", details: error.issues });
    if (error instanceof ApiError) return reply.code(error.statusCode).send({ error: error.message, details: error.details });
    if ((error as any).code === "P2025") return reply.code(404).send({ error: "Registro não encontrado." });
    const httpError = error as { statusCode?: number; message?: string; code?: string };
    if (typeof httpError.statusCode === "number" && httpError.statusCode >= 400 && httpError.statusCode < 500) {
      return reply.code(httpError.statusCode).send({ error: httpError.message, code: httpError.code });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Erro interno." });
  });

  await app.register(planRoutes);
  await app.register(taskRoutes);
  await app.register(uiStateRoutes);
  await app.register(agentRoutes);
  await app.register(eventRoutes);
  await app.register(webhookRoutes);
  await app.register(uploadRoutes);
  await app.register(intentRoutes);
  await app.register(governanceRoutes);
  await app.register(browserRoutes);

  return app;
}
