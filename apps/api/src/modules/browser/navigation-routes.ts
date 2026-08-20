import type { FastifyInstance } from "fastify";
import { browserNavigationSchema } from "@carro-chefe/contracts";
import { z } from "zod";
import { ApiError, parseJson } from "../../lib/errors";
import { broadcastEvent } from "../../lib/outbox";
import { requireTrustedRequest } from "../../security";
import { safeProjectFile } from "./file-access";
import { runParamsSchema } from "./schemas";
import { createBrowserNavigation, findBrowserRun, listBrowserNavigations, markBrowserNavigationOpened, uploadExists } from "./repository";

const navigationQuerySchema = z.object({ runId: z.string().max(200).optional(), taskId: z.string().max(200).optional() }).strict();
const navigationParamsSchema = z.object({ navigationId: z.string().trim().min(1).max(200) }).strict();

export async function browserNavigationRoutes(app: FastifyInstance) {
  app.get("/api/v1/browser-navigations", { preHandler: requireTrustedRequest }, async (request) => {
    const query = navigationQuerySchema.parse(request.query);
    const navigations = await listBrowserNavigations(query);
    return navigations.map((item) => ({ ...item, result: parseJson(item.resultJson, {}), resultJson: undefined }));
  });

  app.post("/api/v1/agent-runs/:runId/browser-navigations", { preHandler: requireTrustedRequest }, async (request, reply) => {
    const { runId } = runParamsSchema.parse(request.params);
    const input = browserNavigationSchema.parse(request.body);
    const run = await findBrowserRun(runId);
    if (!run) throw new ApiError(404, "Execução não encontrada.");
    if (!run.taskId) throw new ApiError(422, "Registrar navegação exige uma tarefa vinculada; em conversas, use browser-state e browser-actions.");
    if (!run.agent.browserEnabled) throw new ApiError(403, "O navegador integrado está desabilitado para este agente.");
    if (input.targetType === "url") {
      let url: URL;
      try { url = new URL(input.target); } catch { throw new ApiError(400, "URL inválida."); }
      if (!["http:", "https:"].includes(url.protocol)) throw new ApiError(400, "Somente endereços HTTP e HTTPS são permitidos.");
    }
    if (input.targetType === "file") await safeProjectFile(input.target);
    if (input.targetType === "upload" && !await uploadExists(input.target)) throw new ApiError(404, "Anexo não encontrado.");
    const taskId = run.taskId;
    const result = await createBrowserNavigation({ runId, taskId, intentId: run.intentId, ...input });
    broadcastEvent(result.event);
    return reply.code(201).send(result.navigation);
  });

  app.post("/api/v1/browser-navigations/:navigationId/opened", { preHandler: requireTrustedRequest }, async (request) => {
    const { navigationId } = navigationParamsSchema.parse(request.params);
    const result = await markBrowserNavigationOpened(navigationId);
    broadcastEvent(result.event);
    return result.navigation;
  });
}
