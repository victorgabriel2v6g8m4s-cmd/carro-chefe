import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";
import { z } from "zod";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/ogg",
  "application/pdf", "text/plain", "text/csv", "application/json", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);
const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");
const outputRoot = path.join(config.projectRoot, "output");

function field(fields: Record<string, any>, name: string) {
  return typeof fields?.[name]?.value === "string" ? fields[name].value.trim() : undefined;
}

export async function uploadRoutes(app: FastifyInstance) {
  app.get("/api/v1/uploads", async (request) => {
    const query = request.query as { taskId?: string; runId?: string; intentId?: string; decisionId?: string; questionId?: string; managementMessageId?: string };
    return prisma.upload.findMany({ where: { taskId: query.taskId || undefined, runId: query.runId || undefined, intentId: query.intentId || undefined,
      decisionId: query.decisionId || undefined, questionId: query.questionId || undefined, managementMessageId: query.managementMessageId || undefined }, orderBy: { createdAt: "desc" } });
  });
  app.post("/api/v1/uploads", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const part = await request.file({ limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 8 } });
    if (!part) throw new ApiError(400, "Envie um arquivo no campo file.");
    if (!allowedTypes.has(part.mimetype)) throw new ApiError(415, "Tipo de arquivo não permitido.");
    const buffer = await part.toBuffer();
    if (!buffer.length) throw new ApiError(400, "O arquivo está vazio.");
    const taskId = field(part.fields as any, "taskId") || null;
    const runId = field(part.fields as any, "runId") || null;
    const intentId = field(part.fields as any, "intentId") || null;
    const decisionId = field(part.fields as any, "decisionId") || null;
    const purpose = field(part.fields as any, "purpose") || null;
    const actor = field(part.fields as any, "actor") || "proprietario";
    const draftPurposes = new Set(["intent-draft", "question-answer-draft", "management-message-draft", "knowledge-node-draft"]);
    if (!taskId && !runId && !intentId && !decisionId && !draftPurposes.has(purpose ?? "")) throw new ApiError(400, "Vincule o arquivo a uma tarefa, execução, comando, decisão, resposta ou ramo da memória.");
    if (taskId && !await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } })) throw new ApiError(400, "Tarefa inexistente.");
    if (runId && !await prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true } })) throw new ApiError(400, "Execução inexistente.");
    if (intentId && !await prisma.operationalIntent.findUnique({ where: { id: intentId }, select: { id: true } })) throw new ApiError(400, "Comando inexistente.");
    if (decisionId && !await prisma.decision.findUnique({ where: { id: decisionId }, select: { id: true } })) throw new ApiError(400, "Decisão inexistente.");
    await fs.mkdir(uploadRoot, { recursive: true });
    const storageName = crypto.randomUUID();
    const destination = path.join(uploadRoot, storageName);
    await fs.writeFile(destination, buffer, { flag: "wx" });
    try {
      const upload = await prisma.upload.create({ data: { taskId, runId, intentId, decisionId, actor, originalName: path.basename(part.filename).slice(0, 240), storageName, mimeType: part.mimetype, sizeBytes: buffer.length, sha256: crypto.createHash("sha256").update(buffer).digest("hex") } });
      return reply.code(201).send(upload);
    } catch (error) { await fs.rm(destination, { force: true }); throw error; }
  });
  app.post("/api/v1/agent-runs/:runId/artifacts", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const input = z.object({ path: z.string().trim().min(1).max(2_000), title: z.string().trim().min(2).max(180).optional() }).parse(request.body);
    const run = await prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true, taskId: true, intentId: true, agentId: true, agent: { select: { workspaceMode: true } } } });
    if (!run) throw new ApiError(404, "Execução inexistente.");
    const relativeRoot = run.agentId !== "AG-DEV" && run.agent.workspaceMode === "artifacts" ? path.join(outputRoot, ".agent-workspaces", runId) : config.projectRoot;
    const projectRelativeOutput = input.path.replaceAll("\\", "/").startsWith("output/");
    const candidate = path.isAbsolute(input.path) ? path.resolve(input.path) : path.resolve(projectRelativeOutput ? config.projectRoot : relativeRoot, input.path);
    const outputRelative = path.relative(outputRoot, candidate);
    if (outputRelative.startsWith("..") || path.isAbsolute(outputRelative)) throw new ApiError(403, "Artefatos de agentes devem estar dentro de output/.");
    const stat = await fs.stat(candidate).catch(() => null);
    if (!stat?.isFile()) throw new ApiError(404, "Artefato não encontrado.");
    const extension = path.extname(candidate).toLowerCase();
    const mimeType = extension === ".pdf" ? "application/pdf" : extension === ".png" ? "image/png" : [".jpg", ".jpeg"].includes(extension) ? "image/jpeg" : extension === ".webp" ? "image/webp" : extension === ".gif" ? "image/gif" : extension === ".mp4" ? "video/mp4" : extension === ".webm" ? "video/webm" : extension === ".mp3" ? "audio/mpeg" : extension === ".wav" ? "audio/wav" : extension === ".ogg" ? "audio/ogg" : extension === ".txt" ? "text/plain" : extension === ".csv" ? "text/csv" : extension === ".json" ? "application/json" : null;
    if (!mimeType || !allowedTypes.has(mimeType)) throw new ApiError(415, "Tipo de artefato não permitido.");
    const buffer = await fs.readFile(candidate);
    if (buffer.length > 10 * 1024 * 1024) throw new ApiError(413, "O artefato excede 10 MB.");
    await fs.mkdir(uploadRoot, { recursive: true });
    const storageName = crypto.randomUUID();
    const destination = path.join(uploadRoot, storageName);
    await fs.writeFile(destination, buffer, { flag: "wx" });
    try {
      const upload = await prisma.upload.create({ data: { taskId: run.taskId, runId, intentId: run.intentId, actor: run.agentId,
        originalName: path.basename(candidate).slice(0, 240), storageName, mimeType, sizeBytes: buffer.length,
        sha256: crypto.createHash("sha256").update(buffer).digest("hex") } });
      await prisma.auditEvent.create({ data: { taskId: run.taskId, actor: run.agentId, action: "agent_artifact_registered", entityType: "upload", entityId: upload.id,
        summary: input.title || upload.originalName, afterJson: JSON.stringify({ runId, intentId: run.intentId, path: path.relative(config.projectRoot, candidate).replaceAll("\\", "/") }) } });
      return reply.code(201).send({ ...upload, title: input.title || upload.originalName, contentUrl: `/api/v1/uploads/${upload.id}/content`, viewerRoute: `/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}` });
    } catch (error) { await fs.rm(destination, { force: true }); throw error; }
  });
  app.get("/api/v1/uploads/:uploadId", async (request) => {
    const upload = await prisma.upload.findUnique({ where: { id: (request.params as { uploadId: string }).uploadId } });
    if (!upload) throw new ApiError(404, "Arquivo não encontrado.");
    return upload;
  });
  app.get("/api/v1/uploads/:uploadId/content", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const upload = await prisma.upload.findUnique({ where: { id: (request.params as { uploadId: string }).uploadId } });
    if (!upload) throw new ApiError(404, "Arquivo não encontrado.");
    const target = path.join(uploadRoot, upload.storageName);
    if (!target.startsWith(uploadRoot)) throw new ApiError(403, "Caminho inválido.");
    const disposition = (request.query as { disposition?: string }).disposition === "inline" ? "inline" : "attachment";
    reply.header("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`);
    return reply.type(upload.mimeType).send(await fs.readFile(target));
  });
}
