import { prisma } from "@carro-chefe/database";

export type UploadReferences = { taskId: string | null; runId: string | null; intentId: string | null; decisionId: string | null };
export type StoredUploadInput = UploadReferences & {
  actor: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export function listUploads(filters: { taskId?: string; runId?: string; intentId?: string; decisionId?: string; questionId?: string; managementMessageId?: string }) {
  return prisma.upload.findMany({ where: filters, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function referencesExist(input: UploadReferences) {
  const [task, run, intent, decision] = await Promise.all([
    input.taskId ? prisma.task.findUnique({ where: { id: input.taskId }, select: { id: true } }) : true,
    input.runId ? prisma.agentRun.findUnique({ where: { id: input.runId }, select: { id: true } }) : true,
    input.intentId ? prisma.operationalIntent.findUnique({ where: { id: input.intentId }, select: { id: true } }) : true,
    input.decisionId ? prisma.decision.findUnique({ where: { id: input.decisionId }, select: { id: true } }) : true
  ]);
  return { task: Boolean(task), run: Boolean(run), intent: Boolean(intent), decision: Boolean(decision) };
}

export function createUpload(input: StoredUploadInput) {
  return prisma.upload.create({ data: input });
}

export function findUpload(uploadId: string) {
  return prisma.upload.findUnique({ where: { id: uploadId } });
}

export function findArtifactRun(runId: string) {
  return prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true, taskId: true, intentId: true, agentId: true, agent: { select: { workspaceMode: true } } } });
}

export function registerArtifact(input: StoredUploadInput & { runId: string; taskId: string | null; intentId: string | null; title?: string; sourcePath: string }) {
  return prisma.$transaction(async (tx) => {
    const upload = await tx.upload.create({ data: { taskId: input.taskId, runId: input.runId, intentId: input.intentId, decisionId: null, actor: input.actor,
      originalName: input.originalName, storageName: input.storageName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, sha256: input.sha256 } });
    await tx.auditEvent.create({ data: { taskId: input.taskId, actor: input.actor, action: "agent_artifact_registered", entityType: "upload", entityId: upload.id,
      summary: input.title || upload.originalName, afterJson: JSON.stringify({ runId: input.runId, intentId: input.intentId, path: input.sourcePath }) } });
    return upload;
  });
}
