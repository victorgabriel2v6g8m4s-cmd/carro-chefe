import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { createTaskSchema, taskTransitionSchema } from "@carro-chefe/contracts";
import { ApiError } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { presentTask, taskDetailInclude, taskInclude } from "../plan/service";

export async function taskRoutes(app: FastifyInstance) {
  app.post("/api/v1/tasks", async (request, reply) => {
    const input = createTaskSchema.parse(request.body);
    const [existing, pillar, milestone, owner, dependencies] = await Promise.all([
      prisma.task.findUnique({ where: { id: input.id } }), prisma.pillar.findUnique({ where: { id: input.pillarId } }),
      prisma.milestone.findUnique({ where: { id: input.milestoneId } }), prisma.agentDefinition.findUnique({ where: { id: input.ownerAgentId } }),
      prisma.task.findMany({ where: { id: { in: input.dependencyIds } }, select: { id: true } })
    ]);
    if (existing) throw new ApiError(409, "Já existe uma tarefa com este ID.");
    if (!pillar || !milestone || !owner || dependencies.length !== new Set(input.dependencyIds).size) throw new ApiError(400, "Pilar, marco, agente ou dependência inválida.");
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data: { id: input.id, projectId: "carro-chefe", pillarId: input.pillarId, milestoneId: input.milestoneId,
        ownerAgentId: input.ownerAgentId, title: input.title, impact: input.impact, urgency: input.urgency, status: input.status, acceptance: input.acceptance } });
      for (const dependencyId of new Set(input.dependencyIds)) await tx.taskDependency.create({ data: { taskId: task.id, dependencyId } });
      await tx.auditEvent.create({ data: { taskId: task.id, actor: input.actor, action: "task_added", entityType: "task", entityId: task.id, summary: `Tarefa adicionada: ${task.title}`, afterJson: JSON.stringify(task) } });
      const event = await appendEvent(tx, "task.created", "task", task.id, task); return { task, event };
    });
    broadcastEvent(result.event);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: result.task.id }, include: taskDetailInclude });
    return reply.code(201).send(presentTask(task));
  });
  app.get("/api/v1/tasks", async (request) => {
    const query = request.query as { status?: string; owner?: string; phase?: string; q?: string };
    const tasks = await prisma.task.findMany({ where: {
      status: query.status || undefined, ownerAgentId: query.owner || undefined, milestoneId: query.phase || undefined,
      title: query.q ? { contains: query.q } : undefined
    }, include: taskInclude, orderBy: [{ impact: "desc" }, { urgency: "desc" }] });
    return tasks.map(presentTask);
  });

  app.get("/api/v1/tasks/:taskId", async (request) => {
    const { taskId } = request.params as { taskId: string };
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskDetailInclude });
    if (!task) throw new ApiError(404, "Tarefa não encontrada.");
    return presentTask(task);
  });

  app.post("/api/v1/tasks/:taskId/status-transitions", async (request) => {
    const { taskId } = request.params as { taskId: string };
    const input = taskTransitionSchema.parse(request.body);
    const current = await prisma.task.findUnique({ where: { id: taskId } });
    if (!current) throw new ApiError(404, "Tarefa não encontrada.");
    if (current.version !== input.expectedVersion) throw new ApiError(409, "A tarefa foi alterada. Recarregue antes de continuar.");
    if (current.status === input.toStatus) throw new ApiError(400, "Escolha um status diferente do atual.");
    const existingEvidence = JSON.parse(current.evidenceJson) as string[];
    if (input.toStatus === "done" && !existingEvidence.length && !input.evidence.length) {
      throw new ApiError(400, "Para concluir, registre ao menos uma evidência.");
    }
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({ where: { id: taskId }, data: {
        status: input.toStatus, statusJustification: input.justification, statusChangedAt: new Date(),
        statusChangedBy: input.actor, evidenceJson: JSON.stringify([...new Set([...existingEvidence, ...input.evidence])]),
        version: { increment: 1 }
      }});
      const transition = await tx.taskStatusTransition.create({ data: { taskId, fromStatus: current.status,
        toStatus: input.toStatus, justification: input.justification, actor: input.actor, evidenceJson: JSON.stringify(input.evidence) } });
      await tx.auditEvent.create({ data: { taskId, actor: input.actor, action: input.toStatus === "done" ? "task_resolved" : input.toStatus === "cancelled" ? "task_cancelled" : "task_status_changed", entityType: "task",
        entityId: taskId, summary: `${current.status} → ${input.toStatus}: ${input.justification}`,
        beforeJson: JSON.stringify({ status: current.status, version: current.version }),
        afterJson: JSON.stringify({ status: updated.status, version: updated.version }) } });
      const event = await appendEvent(tx, "task.status.changed", "task", taskId, { taskId, transition });
      return { updated, transition, event };
    });
    broadcastEvent(result.event);
    return { task: result.updated, transition: result.transition };
  });

  app.get("/api/v1/tasks/:taskId/timeline", async (request) => {
    const { taskId } = request.params as { taskId: string };
    const [transitions, audit, runs, questions] = await Promise.all([
      prisma.taskStatusTransition.findMany({ where: { taskId }, orderBy: { createdAt: "desc" } }),
      prisma.auditEvent.findMany({ where: { taskId }, orderBy: { createdAt: "desc" } }),
      prisma.agentRun.findMany({ where: { taskId }, orderBy: { createdAt: "desc" } }),
      prisma.agentQuestion.findMany({ where: { taskId }, orderBy: { createdAt: "desc" } })
    ]);
    return { transitions, audit, runs, questions };
  });
}
