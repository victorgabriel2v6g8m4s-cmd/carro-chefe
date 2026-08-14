import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { browserNavigationSchema } from "@carro-chefe/contracts";
import { config } from "../../config";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { z } from "zod";
import { browserSnapshot, browserState, interactBrowser, navigateBrowser } from "./session";

const blockedSegments = new Set([".git", ".runtime", "node_modules"]);
const textExtensions = new Set([".txt", ".md", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".sql", ".prisma", ".csv"]);
const inlineTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf" };

async function safeProjectFile(input: string) {
  if (!input || input.includes("\0")) throw new ApiError(400, "Caminho inválido.");
  const candidate = path.isAbsolute(input) ? path.resolve(input) : path.resolve(config.projectRoot, input);
  const relative = path.relative(config.projectRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some((part) => blockedSegments.has(part) || part.toLowerCase().startsWith(".env"))) {
    throw new ApiError(403, "O visualizador só abre arquivos públicos do projeto.");
  }
  const real = await fs.realpath(candidate).catch(() => null);
  if (!real || path.relative(config.projectRoot, real).startsWith("..")) throw new ApiError(404, "Arquivo não encontrado.");
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new ApiError(400, "O caminho não aponta para um arquivo.");
  return { real, relative: path.relative(config.projectRoot, real).replaceAll("\\", "/"), stat };
}

export async function browserRoutes(app: FastifyInstance) {
  app.get("/api/v1/browser/session/:sessionId/snapshot", { config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request, reply) => {
    const snapshot = await browserSnapshot((request.params as { sessionId: string }).sessionId);
    reply.header("X-Browser-Url", encodeURIComponent(snapshot.url));
    reply.header("X-Browser-Title", encodeURIComponent(snapshot.title));
    return reply.type("image/jpeg").send(snapshot.image);
  });

  app.post("/api/v1/browser/session/:sessionId/navigate", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = z.object({ url: z.string().trim().min(4).max(2_000) }).parse(request.body);
    const snapshot = await navigateBrowser((request.params as { sessionId: string }).sessionId, input.url);
    reply.header("X-Browser-Url", encodeURIComponent(snapshot.url));
    reply.header("X-Browser-Title", encodeURIComponent(snapshot.title));
    return reply.type("image/jpeg").send(snapshot.image);
  });

  app.post("/api/v1/browser/session/:sessionId/interact", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request) => {
    const input = z.object({ action: z.enum(["click", "click_text", "type", "back", "reload", "scroll"]), x: z.number().min(0).max(1440).optional(), y: z.number().min(0).max(900).optional(), deltaY: z.number().min(-4000).max(4000).optional(), text: z.string().max(2_000).optional(), selector: z.string().max(500).optional() }).parse(request.body);
    const snapshot = await interactBrowser((request.params as { sessionId: string }).sessionId, input.action, input);
    return { url: snapshot.url, title: snapshot.title };
  });

  app.get("/api/v1/agent-runs/:runId/browser-state", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request) => {
    const { runId } = request.params as { runId: string };
    if (!await prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true } })) throw new ApiError(404, "Execução não encontrada.");
    return browserState(`co-${runId}`);
  });

  app.post("/api/v1/agent-runs/:runId/browser-actions", { config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request) => {
    const { runId } = request.params as { runId: string };
    const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: { agent: { select: { browserEnabled: true } } } });
    if (!run) throw new ApiError(404, "Execução não encontrada.");
    if (!run.agent.browserEnabled) throw new ApiError(403, "Navegador desabilitado para este agente.");
    const input = z.object({ action: z.enum(["click", "click_text", "type", "back", "reload", "scroll"]), x: z.number().min(0).max(1440).optional(), y: z.number().min(0).max(900).optional(), deltaY: z.number().min(-4000).max(4000).optional(), text: z.string().max(2_000).optional(), selector: z.string().max(500).optional() }).parse(request.body);
    await interactBrowser(`co-${runId}`, input.action, input);
    return browserState(`co-${runId}`);
  });

  app.get("/api/v1/files/preview", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request) => {
    const query = request.query as { path?: string };
    const file = await safeProjectFile(query.path ?? "");
    const extension = path.extname(file.real).toLowerCase();
    const base = { name: path.basename(file.real), path: file.relative, sizeBytes: file.stat.size, mimeType: inlineTypes[extension] ?? (textExtensions.has(extension) ? "text/plain" : "application/octet-stream") };
    if (textExtensions.has(extension)) return { ...base, kind: "text", text: (await fs.readFile(file.real, "utf8")).slice(0, 300_000) };
    if (inlineTypes[extension]) return { ...base, kind: extension === ".pdf" ? "pdf" : "image", contentUrl: `/api/v1/files/content?path=${encodeURIComponent(file.relative)}` };
    return { ...base, kind: "unsupported" };
  });

  app.get("/api/v1/files/content", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const file = await safeProjectFile((request.query as { path?: string }).path ?? "");
    const mimeType = inlineTypes[path.extname(file.real).toLowerCase()];
    if (!mimeType) throw new ApiError(415, "Este tipo de arquivo não possui visualização inline.");
    reply.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(path.basename(file.real))}`);
    return reply.type(mimeType).send(await fs.readFile(file.real));
  });

  app.get("/api/v1/browser-navigations", async (request) => {
    const query = request.query as { runId?: string; taskId?: string };
    const navigations = await prisma.browserNavigation.findMany({ where: { runId: query.runId || undefined, taskId: query.taskId || undefined }, orderBy: { createdAt: "desc" }, take: 100 });
    return navigations.map((item) => ({ ...item, result: parseJson(item.resultJson, {}), resultJson: undefined }));
  });

  app.post("/api/v1/agent-runs/:runId/browser-navigations", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const input = browserNavigationSchema.parse(request.body);
    const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: { agent: { select: { browserEnabled: true } } } });
    if (!run) throw new ApiError(404, "Execução não encontrada.");
    if (!run.taskId) throw new ApiError(422, "Registrar navegação exige uma tarefa vinculada; em conversas, use browser-state e browser-actions.");
    const taskId = run.taskId;
    if (!run.agent.browserEnabled) throw new ApiError(403, "O navegador integrado está desabilitado para este agente.");
    if (input.targetType === "url") {
      let url: URL;
      try { url = new URL(input.target); } catch { throw new ApiError(400, "URL inválida."); }
      if (!["http:", "https:"].includes(url.protocol)) throw new ApiError(400, "Somente endereços HTTP e HTTPS são permitidos.");
    }
    if (input.targetType === "file") await safeProjectFile(input.target);
    if (input.targetType === "upload" && !await prisma.upload.findUnique({ where: { id: input.target } })) throw new ApiError(404, "Anexo não encontrado.");
    const result = await prisma.$transaction(async (tx) => {
      const navigation = await tx.browserNavigation.create({ data: { runId, taskId, ...input } });
      await tx.agentCommunication.create({ data: { runId, intentId: run.intentId, sourceId: input.actor, targetId: "PROPRIETARIO", kind: "update", summary: `Navegador: ${input.title || input.target}` } });
      const event = await appendEvent(tx, "browser.navigation.requested", "agent_run", runId, navigation);
      return { navigation, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(result.navigation);
  });

  app.post("/api/v1/browser-navigations/:navigationId/opened", async (request) => {
    const { navigationId } = request.params as { navigationId: string };
    const navigation = await prisma.browserNavigation.update({ where: { id: navigationId }, data: { status: "opened", openedAt: new Date() } });
    const event = await prisma.outboxEvent.create({ data: { topic: "browser.navigation.opened", aggregateType: "agent_run", aggregateId: navigation.runId, payloadJson: JSON.stringify(navigation) } });
    broadcastEvent(event);
    return navigation;
  });
}
