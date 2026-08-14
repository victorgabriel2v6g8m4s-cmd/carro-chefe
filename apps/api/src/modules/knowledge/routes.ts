import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { captureKnowledgeSchema, createKnowledgeNodeSchema, updateKnowledgeNodeSchema } from "@carro-chefe/contracts";
import { z } from "zod";
import { ApiError } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { getRelevantKnowledge, normalizeKnowledgePath, normalizeKnowledgeSegment, presentKnowledgeNode, upsertKnowledgeValue } from "./service";

const deleteSchema = z.object({ expectedVersion: z.number().int().positive(), actor: z.string().trim().min(2).max(80).default("PROPRIETARIO") });

const nodeInclude = {
  _count: { select: { children: { where: { status: "active" } }, attachments: true } },
  attachments: { include: { upload: true }, orderBy: { createdAt: "desc" as const }, take: 4 }
};

async function validateAttachments(ids: string[]) {
  if (!ids.length) return [];
  const uploads = await prisma.upload.findMany({ where: { id: { in: [...new Set(ids)] } } });
  if (uploads.length !== new Set(ids).size) throw new ApiError(400, "Um ou mais arquivos não existem.");
  return uploads;
}

async function collectDescendantIds(rootId: string) {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await prisma.knowledgeNode.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    frontier = children.map((item) => item.id).filter((id) => !ids.includes(id));
    ids.push(...frontier);
  }
  return ids;
}

export async function knowledgeRoutes(app: FastifyInstance) {
  app.get("/api/v1/knowledge/nodes", async (request) => {
    const query = request.query as { parentId?: string; q?: string; limit?: string };
    const limit = Math.max(1, Math.min(100, Number(query.limit ?? 40) || 40));
    if (query.q?.trim()) {
      const q = query.q.trim();
      const items = await prisma.knowledgeNode.findMany({ where: { status: "active", OR: [{ path: { contains: q } }, { name: { contains: q } }, { value: { contains: q } }] },
        include: nodeInclude, orderBy: [{ updatedAt: "desc" }, { name: "asc" }], take: limit });
      return items.map(presentKnowledgeNode);
    }
    const parentId = query.parentId && query.parentId !== "root" ? query.parentId : null;
    if (parentId && !await prisma.knowledgeNode.findFirst({ where: { id: parentId, status: "active" }, select: { id: true } })) throw new ApiError(404, "Ramo pai não encontrado.");
    const items = await prisma.knowledgeNode.findMany({ where: { parentId, status: "active" }, include: nodeInclude, orderBy: [{ kind: "asc" }, { name: "asc" }], take: limit });
    return items.map(presentKnowledgeNode);
  });

  app.get("/api/v1/knowledge/nodes/:nodeId", async (request) => {
    const node = await prisma.knowledgeNode.findFirst({ where: { id: (request.params as { nodeId: string }).nodeId, status: "active" }, include: nodeInclude });
    if (!node) throw new ApiError(404, "Ramo não encontrado.");
    return presentKnowledgeNode(node);
  });

  app.get("/api/v1/knowledge/resolve", async (request) => {
    const path = normalizeKnowledgePath((request.query as { path?: string }).path ?? "");
    if (!path) throw new ApiError(400, "Informe o caminho da memória.");
    const node = await prisma.knowledgeNode.findFirst({ where: { projectId: "carro-chefe", path, status: "active" }, include: nodeInclude });
    if (!node) throw new ApiError(404, `Nenhuma informação salva em ${path}.`);
    return presentKnowledgeNode(node);
  });

  app.get("/api/v1/knowledge/context", async (request) => {
    const query = request.query as { query?: string; limit?: string };
    return getRelevantKnowledge(query.query ?? "", Number(query.limit ?? 12) || 12);
  });

  app.post("/api/v1/knowledge/nodes", async (request, reply) => {
    const input = createKnowledgeNodeSchema.parse(request.body);
    await validateAttachments(input.attachmentIds);
    const parent = input.parentId ? await prisma.knowledgeNode.findFirst({ where: { id: input.parentId, status: "active" } }) : null;
    if (input.parentId && !parent) throw new ApiError(404, "Ramo pai não encontrado.");
    const slug = normalizeKnowledgeSegment(input.name);
    const path = parent ? `${parent.path}/${slug}` : slug;
    if (await prisma.knowledgeNode.findUnique({ where: { projectId_path: { projectId: "carro-chefe", path } } })) throw new ApiError(409, "Já existe um ramo com este caminho.");
    const result = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.create({ data: { projectId: "carro-chefe", parentId: parent?.id ?? null, slug, name: input.name, path,
        kind: input.kind, value: input.value, valueType: input.valueType, verificationStatus: input.verificationStatus,
        referencesJson: JSON.stringify(input.references), sourceType: "manual", sourceRunId: input.sourceRunId, sourceIntentId: input.sourceIntentId,
        sourceId: input.sourceRunId ?? input.sourceIntentId, createdBy: input.actor } });
      if (input.attachmentIds.length) await tx.knowledgeNodeAttachment.createMany({ data: [...new Set(input.attachmentIds)].map((uploadId) => ({ nodeId: node.id, uploadId })) });
      await tx.auditEvent.create({ data: { actor: input.actor, action: "knowledge_branch_added", entityType: "knowledge_node", entityId: node.id,
        summary: `Ramo criado: ${path}`, afterJson: JSON.stringify({ path, kind: input.kind, value: input.value, references: input.references, attachmentIds: input.attachmentIds }) } });
      const event = await appendEvent(tx, "knowledge.node.created", "knowledge_node", node.id, { nodeId: node.id, parentId: node.parentId, path });
      return { node, event };
    });
    broadcastEvent(result.event);
    const created = await prisma.knowledgeNode.findUniqueOrThrow({ where: { id: result.node.id }, include: nodeInclude });
    return reply.code(201).send(presentKnowledgeNode(created));
  });

  app.patch("/api/v1/knowledge/nodes/:nodeId", async (request) => {
    const nodeId = (request.params as { nodeId: string }).nodeId;
    const input = updateKnowledgeNodeSchema.parse(request.body);
    await validateAttachments(input.attachmentIds ?? []);
    const current = await prisma.knowledgeNode.findFirst({ where: { id: nodeId, status: "active" } });
    if (!current) throw new ApiError(404, "Ramo não encontrado.");
    if (current.version !== input.expectedVersion) throw new ApiError(409, "O ramo mudou. Recarregue antes de salvar.");
    const slug = input.name ? normalizeKnowledgeSegment(input.name) : current.slug;
    const parent = current.parentId ? await prisma.knowledgeNode.findUnique({ where: { id: current.parentId } }) : null;
    const nextPath = parent ? `${parent.path}/${slug}` : slug;
    if (nextPath !== current.path && await prisma.knowledgeNode.findFirst({ where: { projectId: current.projectId, path: nextPath, id: { not: nodeId } } })) throw new ApiError(409, "Já existe um ramo com este caminho.");
    const descendants = nextPath === current.path ? [] : await prisma.knowledgeNode.findMany({ where: { path: { startsWith: `${current.path}/` } }, orderBy: { path: "asc" } });
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeNode.update({ where: { id: nodeId }, data: { name: input.name, slug, path: nextPath, kind: input.kind,
        value: input.value, valueType: input.valueType, verificationStatus: input.verificationStatus,
        referencesJson: input.references ? JSON.stringify(input.references) : undefined, version: { increment: 1 } } });
      for (const child of descendants) await tx.knowledgeNode.update({ where: { id: child.id }, data: { path: `${nextPath}${child.path.slice(current.path.length)}`, version: { increment: 1 } } });
      if (input.attachmentIds) {
        await tx.knowledgeNodeAttachment.deleteMany({ where: { nodeId } });
        if (input.attachmentIds.length) await tx.knowledgeNodeAttachment.createMany({ data: [...new Set(input.attachmentIds)].map((uploadId) => ({ nodeId, uploadId })) });
      }
      await tx.auditEvent.create({ data: { actor: input.actor, action: "knowledge_branch_edited", entityType: "knowledge_node", entityId: nodeId,
        summary: `Ramo editado: ${current.path} → ${nextPath}`, beforeJson: JSON.stringify(current), afterJson: JSON.stringify(updated) } });
      const event = await appendEvent(tx, "knowledge.node.updated", "knowledge_node", nodeId, { nodeId, parentId: current.parentId, path: nextPath });
      return { updated, event };
    });
    broadcastEvent(result.event);
    return presentKnowledgeNode(await prisma.knowledgeNode.findUniqueOrThrow({ where: { id: nodeId }, include: nodeInclude }));
  });

  app.delete("/api/v1/knowledge/nodes/:nodeId", async (request, reply) => {
    const nodeId = (request.params as { nodeId: string }).nodeId;
    const input = deleteSchema.parse(request.body);
    const current = await prisma.knowledgeNode.findFirst({ where: { id: nodeId, status: "active" } });
    if (!current) throw new ApiError(404, "Ramo não encontrado.");
    if (current.version !== input.expectedVersion) throw new ApiError(409, "O ramo mudou. Recarregue antes de excluir.");
    const ids = await collectDescendantIds(nodeId);
    const result = await prisma.$transaction(async (tx) => {
      await tx.knowledgeNode.updateMany({ where: { id: { in: ids } }, data: { status: "archived", version: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actor: input.actor, action: "knowledge_branch_archived", entityType: "knowledge_node", entityId: nodeId,
        summary: `Ramo ocultado da árvore: ${current.path} (${ids.length} nó(s))`, beforeJson: JSON.stringify({ path: current.path, status: current.status }),
        afterJson: JSON.stringify({ status: "archived", affectedNodeIds: ids }) } });
      return appendEvent(tx, "knowledge.node.archived", "knowledge_node", nodeId, { nodeId, parentId: current.parentId, affectedNodeIds: ids });
    });
    broadcastEvent(result);
    return reply.code(200).send({ archived: ids.length, parentId: current.parentId });
  });

  app.post("/api/v1/agent-runs/:runId/knowledge", async (request, reply) => {
    const runId = (request.params as { runId: string }).runId;
    const input = captureKnowledgeSchema.parse(request.body);
    const run = await prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true, intentId: true, agentId: true } });
    if (!run) throw new ApiError(404, "Execução inexistente.");
    const node = await prisma.$transaction((tx) => upsertKnowledgeValue(tx, { path: input.path, name: input.name ?? input.path.split(/[/.>]/).at(-1) ?? "Informação",
      value: input.value, valueType: input.valueType, verificationStatus: input.verificationStatus },
      { actor: input.actor ?? run.agentId, sourceType: "runtime", sourceId: runId, sourceRunId: runId, sourceIntentId: run.intentId }));
    const event = await prisma.outboxEvent.create({ data: { topic: "knowledge.node.captured", aggregateType: "knowledge_node", aggregateId: node.id, payloadJson: JSON.stringify({ nodeId: node.id, runId, path: node.path }) } });
    broadcastEvent(event);
    return reply.code(201).send({ ...presentKnowledgeNode(node), route: `/gestao/conhecimento?node=${encodeURIComponent(node.id)}` });
  });
}
