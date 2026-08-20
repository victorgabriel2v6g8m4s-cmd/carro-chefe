import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../../lib/errors";
import { requireTrustedRequest } from "../../security";
import { multipartField } from "./fields";
import { removeUpload, writeUpload } from "./storage";
import { MAX_UPLOAD_BYTES, validateUpload } from "./upload-policy";
import { createUpload, listUploads, referencesExist, type UploadReferences } from "./repository";

const draftPurposes = new Set(["intent-draft", "question-answer-draft", "management-message-draft", "knowledge-node-draft"]);
const uploadQuerySchema = z.object({
  taskId: z.string().max(200).optional(), runId: z.string().max(200).optional(), intentId: z.string().max(200).optional(),
  decisionId: z.string().max(200).optional(), questionId: z.string().max(200).optional(), managementMessageId: z.string().max(200).optional()
}).strict();

async function assertReferences(input: UploadReferences) {
  const exists = await referencesExist(input);
  if (!exists.task) throw new ApiError(400, "Tarefa inexistente.");
  if (!exists.run) throw new ApiError(400, "Execução inexistente.");
  if (!exists.intent) throw new ApiError(400, "Comando inexistente.");
  if (!exists.decision) throw new ApiError(400, "Decisão inexistente.");
}

export async function directUploadRoutes(app: FastifyInstance) {
  app.get("/api/v1/uploads", { preHandler: requireTrustedRequest }, async (request) => {
    const query = uploadQuerySchema.parse(request.query);
    return listUploads(query);
  });

  app.post("/api/v1/uploads", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const part = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 8 } });
    if (!part) throw new ApiError(400, "Envie um arquivo no campo file.");
    const buffer = await part.toBuffer();
    const validated = validateUpload(buffer, part.mimetype, part.filename);
    const taskId = multipartField(part.fields, "taskId") || null;
    const runId = multipartField(part.fields, "runId") || null;
    const intentId = multipartField(part.fields, "intentId") || null;
    const decisionId = multipartField(part.fields, "decisionId") || null;
    const purpose = multipartField(part.fields, "purpose") || null;
    const actor = multipartField(part.fields, "actor", 100) || "proprietario";
    if (!taskId && !runId && !intentId && !decisionId && !draftPurposes.has(purpose ?? "")) throw new ApiError(400, "Vincule o arquivo a uma tarefa, execução, comando, decisão, resposta ou ramo da memória.");
    await assertReferences({ taskId, runId, intentId, decisionId });
    const stored = await writeUpload(buffer);
    try {
      const upload = await createUpload({ taskId, runId, intentId, decisionId, actor, originalName: validated.originalName,
        storageName: stored.storageName, mimeType: validated.mimeType, sizeBytes: buffer.length, sha256: stored.sha256 });
      return reply.code(201).send(upload);
    } catch (error) { await removeUpload(stored.destination); throw error; }
  });
}
