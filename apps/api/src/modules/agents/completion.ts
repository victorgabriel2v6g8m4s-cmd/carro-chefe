import { prisma } from "@carro-chefe/database";
import { appendEvent, broadcastEvent } from "../../lib/outbox";

const terminalStatuses = new Set(["succeeded", "failed", "cancelled"]);

/**
 * Fecha o elo entre a execução e a tarefa. O relatório persistido é a evidência
 * da conclusão; execuções parciais ou com falha nunca concluem a tarefa.
 */
export async function finalizeAgentRun(runId: string) {
  const events = await prisma.$transaction(async (tx) => {
    const run = await tx.agentRun.findUnique({ where: { id: runId }, include: { report: true, task: true, agent: true } });
    if (!run || !terminalStatuses.has(run.status)) return [];
    const emitted: any[] = [];
    const succeeded = run.status === "succeeded" && run.report?.outcome === "succeeded";
    const reportSummary = run.report?.summary || (succeeded ? "A execução foi concluída com sucesso." : "A execução terminou e precisa de atenção.");
    const route = `/gestao/tarefas/${run.taskId}`;

    if (succeeded && !["done", "cancelled"].includes(run.task.status)) {
      const evidence = `/gestao/agentes/execucoes/${run.id}`;
      const existingEvidence = JSON.parse(run.task.evidenceJson || "[]") as string[];
      const justification = `Execução concluída por ${run.agent.name}: ${reportSummary}`.slice(0, 1600);
      const updated = await tx.task.update({ where: { id: run.taskId }, data: {
        status: "done", statusJustification: justification, statusChangedAt: new Date(), statusChangedBy: run.agentId,
        evidenceJson: JSON.stringify([...new Set([...existingEvidence, evidence])]), version: { increment: 1 }
      } });
      const transition = await tx.taskStatusTransition.create({ data: { taskId: run.taskId, fromStatus: run.task.status, toStatus: "done",
        justification, actor: run.agentId, evidenceJson: JSON.stringify([evidence]) } });
      await tx.auditEvent.create({ data: { taskId: run.taskId, actor: run.agentId, action: "task_resolved", entityType: "task", entityId: run.taskId,
        summary: `${run.task.status} → done: ${justification}`, beforeJson: JSON.stringify({ status: run.task.status, version: run.task.version }),
        afterJson: JSON.stringify({ status: updated.status, version: updated.version, runId }) } });
      await tx.agentCommunication.create({ data: { runId, intentId: run.intentId, sourceId: run.agentId, targetId: "PROPRIETARIO", kind: "result", status: "delivered", summary: reportSummary } });
      emitted.push(await appendEvent(tx, "task.status.changed", "task", run.taskId, { taskId: run.taskId, transition }));
    }

    const existingNotification = await tx.notification.findUnique({ where: { runId }, select: { type: true, message: true } });
    const notificationType = succeeded ? "success" : "error";
    await tx.notification.upsert({ where: { runId }, update: {
      type: notificationType, title: succeeded ? "Tarefa concluída" : "Execução precisa de atenção",
      message: reportSummary.slice(0, 1000), route, taskId: run.taskId, readAt: null
    }, create: { userId: "owner", runId, taskId: run.taskId, type: succeeded ? "success" : "error",
      title: succeeded ? "Tarefa concluída" : "Execução precisa de atenção", message: reportSummary.slice(0, 1000), route } });
    if (!existingNotification || existingNotification.type !== notificationType || existingNotification.message !== reportSummary.slice(0, 1000)) {
      emitted.push(await appendEvent(tx, succeeded ? "agent.run.completed" : "agent.run.attention", "agent_run", runId,
        { runId, taskId: run.taskId, outcome: run.report?.outcome ?? run.status, summary: reportSummary, route }));
    }
    return emitted;
  });
  events.forEach(broadcastEvent);
}
