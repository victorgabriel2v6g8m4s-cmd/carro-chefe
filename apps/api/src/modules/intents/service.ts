import { prisma } from "@carro-chefe/database";
import { appendEvent } from "../../lib/outbox";

export const intentInclude = {
  facts: true,
  notification: true,
  uploads: { orderBy: { createdAt: "asc" as const } },
  communications: { orderBy: { createdAt: "asc" as const } },
  runs: { include: { agent: true, task: { select: { id: true, title: true, status: true } }, report: true, steps: { orderBy: { order: "asc" as const } }, messages: { orderBy: { createdAt: "asc" as const } }, questions: { orderBy: { createdAt: "desc" as const } }, usage: true }, orderBy: { createdAt: "asc" as const } }
};

export function presentIntent(intent: any) {
  return { ...intent, classification: JSON.parse(intent.classificationJson), classificationJson: undefined,
    communications: intent.communications?.map((item: any) => ({ ...item, metadata: JSON.parse(item.metadataJson), metadataJson: undefined })),
    runs: intent.runs?.map((run: any) => ({ ...run, report: run.report ? { ...run.report,
      successes: JSON.parse(run.report.successesJson), failures: JSON.parse(run.report.failuresJson),
      recommendations: JSON.parse(run.report.recommendationsJson), evidence: JSON.parse(run.report.evidenceJson),
      successesJson: undefined, failuresJson: undefined, recommendationsJson: undefined, evidenceJson: undefined } : null })) };
}

export async function markIntentRunning(intentId: string | null | undefined) {
  if (!intentId) return null;
  return prisma.$transaction(async (tx) => {
    const changed = await tx.operationalIntent.updateMany({ where: { id: intentId, status: "queued" }, data: { status: "running", startedAt: new Date() } });
    if (!changed.count) return null;
    return appendEvent(tx, "intent.started", "operational_intent", intentId, { intentId, status: "running" });
  });
}

export async function reconcileIntent(intentId: string | null | undefined) {
  if (!intentId) return null;
  return prisma.$transaction(async (tx) => {
    const intent = await tx.operationalIntent.findUnique({ where: { id: intentId }, include: { runs: true, facts: true } });
    if (!intent || ["completed", "failed", "cancelled"].includes(intent.status) || !intent.runs.length) return null;
    const terminal = new Set(["succeeded", "failed", "cancelled"]);
    if (!intent.runs.every((run) => terminal.has(run.status))) return null;
    const succeeded = intent.runs.every((run) => run.status === "succeeded");
    const status = succeeded ? "completed" : "failed";
    await tx.operationalIntent.update({ where: { id: intentId }, data: { status, completedAt: new Date() } });
    await tx.businessFact.updateMany({ where: { sourceIntentId: intentId }, data: { verificationStatus: succeeded ? "reviewed" : "verification_failed" } });
    if (intent.facts.some((fact) => fact.key === "erp.selected")) {
      const erp = intent.facts.find((fact) => fact.key === "erp.selected")?.value;
      await tx.decision.updateMany({ where: { id: "DEC-002" }, data: { status: succeeded ? "review" : "blocked", resolution: succeeded ? `ERP informado: ${erp}. Verificações concluídas no comando ${intentId}; revisar evidências antes da homologação final.` : `ERP informado: ${erp}. A verificação encontrou falha; consultar o comando ${intentId}.` } });
    }
    const notification = await tx.notification.upsert({ where: { intentId }, update: { type: status, title: succeeded ? "Tarefa concluída" : "Tarefa precisa de atenção", message: succeeded ? intent.summary : `A execução de “${intent.summary}” terminou com falha.`, route: `/gestao/comandos/${intentId}`, readAt: null }, create: { userId: "owner", intentId, type: status, title: succeeded ? "Tarefa concluída" : "Tarefa precisa de atenção", message: succeeded ? intent.summary : `A execução de “${intent.summary}” terminou com falha.`, route: `/gestao/comandos/${intentId}` } });
    await tx.auditEvent.create({ data: { actor: "ORQUESTRADOR", action: `intent_${status}`, entityType: "operational_intent", entityId: intentId, summary: notification.message } });
    return appendEvent(tx, `intent.${status}`, "operational_intent", intentId, { intentId, notification });
  });
}
