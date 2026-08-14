import { prisma } from "@carro-chefe/database";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { findNextRoadmapTask, nextStepNotification } from "../tasks/next-step";

const terminalStatuses = new Set(["succeeded", "failed", "cancelled"]);

/**
 * Fecha o elo entre a execução e a tarefa. O relatório persistido é a evidência
 * da conclusão; execuções parciais ou com falha nunca concluem a tarefa.
 */
export async function finalizeAgentRun(runId: string) {
  const events = await prisma.$transaction(async (tx) => {
    const run = await tx.agentRun.findUnique({ where: { id: runId }, include: { report: true, task: true, agent: true,
      dispatchResults: { include: { sourceRun: { include: { agent: true } } } } } });
    if (!run || !terminalStatuses.has(run.status)) return [];
    const emitted: any[] = [];
    const succeeded = run.status === "succeeded" && run.report?.outcome === "succeeded";
    const reportSummary = run.report?.summary || (succeeded ? "A execução foi concluída com sucesso." : "A execução terminou e precisa de atenção.");

    if (run.purpose === "consultation") {
      const dispatchStatus = succeeded ? "succeeded" : run.status === "cancelled" ? "cancelled" : "failed";
      await tx.agentDispatch.updateMany({ where: { resultRunId: run.id }, data: { status: dispatchStatus, completedAt: new Date() } });
      const parentIds = [...new Set(run.dispatchResults.map((item) => item.sourceRunId))];
      for (const parentId of parentIds) {
        const parent = run.dispatchResults.find((item) => item.sourceRunId === parentId)?.sourceRun;
        if (!parent) continue;
        await tx.agentCommunication.create({ data: { runId: parentId, intentId: parent.intentId, sourceId: run.agentId, targetId: parent.agentId,
          kind: "result", status: "delivered", summary: reportSummary, metadataJson: JSON.stringify({ consultationRunId: run.id, outcome: dispatchStatus }) } });
        if (succeeded) {
          const unlockIds = [...new Set(run.dispatchResults.filter((item) => item.sourceRunId === parentId).flatMap((item) => {
            try { return (JSON.parse(item.onSuccessJson || "{}") as { unlock?: string[] }).unlock ?? []; } catch { return []; }
          }))];
          for (const taskId of unlockIds) {
            const task = await tx.task.findUnique({ where: { id: taskId } });
            if (!task || !["backlog", "blocked"].includes(task.status)) continue;
            const justification = `Desbloqueada após parecer concluído por ${run.agent.name}: ${reportSummary}`.slice(0, 1600);
            const updated = await tx.task.update({ where: { id: task.id }, data: { status: "ready", statusJustification: justification,
              statusChangedAt: new Date(), statusChangedBy: "ORQUESTRADOR", version: { increment: 1 } } });
            const transition = await tx.taskStatusTransition.create({ data: { taskId: task.id, fromStatus: task.status, toStatus: "ready", justification, actor: "ORQUESTRADOR" } });
            await tx.auditEvent.create({ data: { taskId: task.id, actor: "ORQUESTRADOR", action: "task_unlocked_by_dispatch", entityType: "task", entityId: task.id,
              summary: `${task.status} → ready: ${justification}`, beforeJson: JSON.stringify({ status: task.status, version: task.version }), afterJson: JSON.stringify({ status: updated.status, version: updated.version, consultationRunId: run.id }) } });
            emitted.push(await appendEvent(tx, "task.status.changed", "task", task.id, { taskId: task.id, transition }));
          }
        }
        const requiredPending = await tx.agentDispatch.count({ where: { sourceRunId: parentId, isRequiredToProceed: true, status: { in: ["buffered", "dispatched", "running"] } } });
        if (!requiredPending && parent.status === "waiting_dependency") {
          await tx.agentRun.update({ where: { id: parentId }, data: { status: "queued", currentStep: "Pareceres obrigatórios recebidos; retomando do ponto salvo", lastHeartbeatAt: new Date() } });
          emitted.push(await appendEvent(tx, "agent.dependencies.resolved", "agent_run", parentId, { sourceRunId: parentId, consultationRunId: run.id }));
        }
      }
      emitted.push(await appendEvent(tx, "agent.consultation.completed", "agent_run", run.id, { runId: run.id, outcome: dispatchStatus, summary: reportSummary }));
      return emitted;
    }

    if (run.purpose === "management_chat") {
      const route = run.managementConversationId ? `/gestao/comandos?conversation=${encodeURIComponent(run.managementConversationId)}` : "/gestao/comandos";
      await tx.notification.upsert({ where: { runId }, update: { type: succeeded ? "success" : "error", title: "Resposta da Gestão",
        message: reportSummary.slice(0, 1000), route, readAt: null }, create: { userId: "owner", runId, type: succeeded ? "success" : "error", title: "Resposta da Gestão", message: reportSummary.slice(0, 1000), route } });
      emitted.push(await appendEvent(tx, succeeded ? "management.response.completed" : "management.response.attention", "agent_run", run.id,
        { runId: run.id, conversationId: run.managementConversationId, summary: reportSummary, route }));
      return emitted;
    }

    if (!run.task) return emitted;
    const taskId = run.task.id;
    const route = `/gestao/tarefas/${taskId}`;

    if (succeeded && !["done", "cancelled"].includes(run.task.status)) {
      const evidence = `/gestao/agentes/execucoes/${run.id}`;
      const existingEvidence = JSON.parse(run.task.evidenceJson || "[]") as string[];
      const justification = `Execução concluída por ${run.agent.name}: ${reportSummary}`.slice(0, 1600);
      const updated = await tx.task.update({ where: { id: taskId }, data: {
        status: "done", statusJustification: justification, statusChangedAt: new Date(), statusChangedBy: run.agentId,
        evidenceJson: JSON.stringify([...new Set([...existingEvidence, evidence])]), version: { increment: 1 }
      } });
      const transition = await tx.taskStatusTransition.create({ data: { taskId, fromStatus: run.task.status, toStatus: "done",
        justification, actor: run.agentId, evidenceJson: JSON.stringify([evidence]) } });
      await tx.auditEvent.create({ data: { taskId, actor: run.agentId, action: "task_resolved", entityType: "task", entityId: taskId,
        summary: `${run.task.status} → done: ${justification}`, beforeJson: JSON.stringify({ status: run.task.status, version: run.task.version }),
        afterJson: JSON.stringify({ status: updated.status, version: updated.version, runId }) } });
      await tx.agentCommunication.create({ data: { runId, intentId: run.intentId, sourceId: run.agentId, targetId: "PROPRIETARIO", kind: "result", status: "delivered", summary: reportSummary } });
      emitted.push(await appendEvent(tx, "task.status.changed", "task", taskId, { taskId, transition }));
      const nextTask = await findNextRoadmapTask(tx, taskId);
      if (nextTask) {
        const suggestion = nextStepNotification(nextTask);
        const notification = await tx.notification.create({ data: { userId: "owner", taskId: nextTask.id, ...suggestion } });
        emitted.push(await appendEvent(tx, "roadmap.next-step.suggested", "task", nextTask.id, { notification, task: nextTask }));
      }
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
