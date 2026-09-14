import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";
import { removeUpload, writeUpload } from "./storage";
import { mimeTypeForFilename, validateUpload } from "./upload-policy";
import { findArtifactRun, registerArtifact } from "./repository";

const outputRoot = path.join(config.projectRoot, "output");
const artifactSchema = z.object({ path: z.string().trim().min(1).max(2_000), title: z.string().trim().min(2).max(180).optional() }).strict();
const runParamsSchema = z.object({ runId: z.string().trim().min(1).max(200) }).strict();

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function resolveArtifact(inputPath: string, runId: string, agentId: string, workspaceMode: string) {
  const workspaceRoot = agentId !== "AG-DEV" && workspaceMode === "artifacts" ? path.join(outputRoot, ".agent-workspaces", runId) : config.projectRoot;
  const isProjectOutput = inputPath.replaceAll("\\", "/").startsWith("output/");
  const candidate = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(isProjectOutput ? config.projectRoot : workspaceRoot, inputPath);
  if (!isInside(outputRoot, candidate)) throw new ApiError(403, "Artefatos de agentes devem estar dentro de output/.");
  const real = await fs.realpath(candidate).catch(() => null);
  if (!real || !isInside(outputRoot, real)) throw new ApiError(404, "Artefato não encontrado.");
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new ApiError(404, "Artefato não encontrado.");
  return real;
}

export async function artifactRoutes(app: FastifyInstance) {
  app.post("/api/v1/agent-runs/:runId/artifacts", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { runId } = runParamsSchema.parse(request.params);
    const input = artifactSchema.parse(request.body);
    const run = await findArtifactRun(runId);
    if (!run) throw new ApiError(404, "Execução inexistente.");
    const candidate = await resolveArtifact(input.path, runId, run.agentId, run.agent.workspaceMode);
    const mimeType = mimeTypeForFilename(candidate);
    if (!mimeType) throw new ApiError(415, "Tipo de artefato não permitido.");
    const buffer = await fs.readFile(candidate);
    const validated = validateUpload(buffer, mimeType, path.basename(candidate));
    const stored = await writeUpload(buffer);
    try {
      const upload = await registerArtifact({ taskId: run.taskId, runId, intentId: run.intentId, decisionId: null, actor: run.agentId,
        originalName: validated.originalName, storageName: stored.storageName, mimeType: validated.mimeType, sizeBytes: buffer.length, sha256: stored.sha256,
        title: input.title, sourcePath: path.relative(config.projectRoot, candidate).replaceAll("\\", "/") });
      return reply.code(201).send({ ...upload, title: input.title || upload.originalName, contentUrl: `/api/v1/uploads/${upload.id}/content`, viewerRoute: `/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}` });
    } catch (error) { await removeUpload(stored.destination); throw error; }
  });
}
