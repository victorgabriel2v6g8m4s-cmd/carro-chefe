import type { FastifyInstance, FastifyReply } from "fastify";
import { ApiError } from "../../lib/errors";
import { requireTrustedRequest } from "../../security";
import { browserSnapshot, browserState, interactBrowser, navigateBrowser } from "./session";
import { browserInteractionSchema, browserTargetSchema, runParamsSchema, sessionParamsSchema } from "./schemas";
import { browserRunExists, findBrowserRun } from "./repository";

function sendSnapshot(reply: FastifyReply, snapshot: Awaited<ReturnType<typeof browserSnapshot>>) {
  reply.header("X-Browser-Url", encodeURIComponent(snapshot.url));
  reply.header("X-Browser-Title", encodeURIComponent(snapshot.title));
  return reply.type("image/jpeg").send(snapshot.image);
}

export async function browserSessionRoutes(app: FastifyInstance) {
  app.get("/api/v1/browser/session/:sessionId/snapshot", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { sessionId } = sessionParamsSchema.parse(request.params);
    return sendSnapshot(reply, await browserSnapshot(sessionId));
  });

  app.post("/api/v1/browser/session/:sessionId/navigate", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { sessionId } = sessionParamsSchema.parse(request.params);
    const input = browserTargetSchema.parse(request.body);
    return sendSnapshot(reply, await navigateBrowser(sessionId, input.url));
  });

  app.post("/api/v1/browser/session/:sessionId/interact", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request) => {
    const { sessionId } = sessionParamsSchema.parse(request.params);
    const input = browserInteractionSchema.parse(request.body);
    const snapshot = await interactBrowser(sessionId, input.action, input);
    return { url: snapshot.url, title: snapshot.title };
  });

  app.get("/api/v1/agent-runs/:runId/browser-state", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request) => {
    const { runId } = runParamsSchema.parse(request.params);
    if (!await browserRunExists(runId)) throw new ApiError(404, "Execução não encontrada.");
    return browserState(`co-${runId}`);
  });

  app.post("/api/v1/agent-runs/:runId/browser-actions", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request) => {
    const { runId } = runParamsSchema.parse(request.params);
    const run = await findBrowserRun(runId);
    if (!run) throw new ApiError(404, "Execução não encontrada.");
    if (!run.agent.browserEnabled) throw new ApiError(403, "Navegador desabilitado para este agente.");
    const input = browserInteractionSchema.parse(request.body);
    await interactBrowser(`co-${runId}`, input.action, input);
    return browserState(`co-${runId}`);
  });
}
