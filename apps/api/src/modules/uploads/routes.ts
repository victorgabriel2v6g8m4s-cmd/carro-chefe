import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain", "text/csv", "application/json", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");

function field(fields: Record<string, any>, name: string) {
  return typeof fields?.[name]?.value === "string" ? fields[name].value.trim() : undefined;
}

export async function uploadRoutes(app: FastifyInstance) {
  app.get("/api/v1/uploads", async (request) => {
    const query = request.query as { taskId?: string; runId?: string; intentId?: string; decisionId?: string };
    return prisma.upload.findMany({ where: { taskId: query.taskId || undefined, runId: query.runId || undefined, intentId: query.intentId || undefined, decisionId: query.decisionId || undefined }, orderBy: { createdAt: "desc" } });
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
    if (!taskId && !runId && !intentId && !decisionId && purpose !== "intent-draft") throw new ApiError(400, "Vincule o arquivo a uma tarefa, execução, comando ou decisão.");
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
