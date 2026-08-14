import { prisma } from "@carro-chefe/database";
import { ApiError, parseJson } from "../../lib/errors";
import { repairLegacyEncodingLoss } from "../../lib/text";
import { deriveJourney, deriveRunReport, presentReport } from "./diagnostics";

export const runInclude = { task: { select: { id: true, title: true, status: true, statusJustification: true, acceptance: true, evidenceJson: true, impact: true, urgency: true } }, agent: true,
  intent: { select: { id: true, subject: true, summary: true, status: true, uploads: { orderBy: { createdAt: "asc" as const } } } },
  steps: { orderBy: { order: "asc" as const } }, messages: { orderBy: { createdAt: "asc" as const } },
  questions: { include: { uploads: { orderBy: { createdAt: "asc" as const } } }, orderBy: { createdAt: "desc" as const } },
  uploads: { orderBy: { createdAt: "asc" as const } }, usage: { orderBy: { createdAt: "asc" as const } } };
export const runDetailInclude = { ...runInclude, report: true, communications: { orderBy: { createdAt: "asc" as const } }, logs: { orderBy: { sequence: "desc" as const }, take: 500 },
  managementConversation: { include: { messages: { include: { uploads: { orderBy: { createdAt: "asc" as const } } }, orderBy: { createdAt: "asc" as const }, take: 30 } } },
  dispatchesSent: { include: { targetAgent: true, resultRun: { include: { agent: true, report: true, messages: { orderBy: { createdAt: "desc" as const }, take: 1 } } } }, orderBy: { createdAt: "asc" as const } } };

export function presentRun(run: any) {
  return { ...run, title: repairLegacyEncodingLoss(run.title), objective: repairLegacyEncodingLoss(run.objective), currentStep: run.currentStep ? repairLegacyEncodingLoss(run.currentStep) : run.currentStep,
    logs: run.logs ? [...run.logs].reverse().map((log: any) => ({ ...log, title: log.title ? repairLegacyEncodingLoss(log.title) : log.title, content: repairLegacyEncodingLoss(log.content) })) : undefined,
    steps: run.steps?.map((step: any) => ({ ...step, title: repairLegacyEncodingLoss(step.title), description: step.description ? repairLegacyEncodingLoss(step.description) : step.description, procedure: step.procedure ? repairLegacyEncodingLoss(step.procedure) : step.procedure, result: step.result ? repairLegacyEncodingLoss(step.result) : step.result })),
    messages: run.messages?.map((message: any) => ({ ...message, content: repairLegacyEncodingLoss(message.content) })),
    questions: run.questions?.map((question: any) => ({ ...question, question: repairLegacyEncodingLoss(question.question), context: repairLegacyEncodingLoss(question.context), recommendation: question.recommendation ? repairLegacyEncodingLoss(question.recommendation) : question.recommendation, answer: question.answer ? repairLegacyEncodingLoss(question.answer) : question.answer,
      options: parseJson(question.optionsJson, []).map((item: string) => repairLegacyEncodingLoss(item)), answerReferences: parseJson(question.answerReferencesJson, []), optionsJson: undefined, answerReferencesJson: undefined })),
    communications: run.communications?.map((item: any) => ({ ...item, summary: repairLegacyEncodingLoss(item.summary), metadata: parseJson(item.metadataJson, {}), metadataJson: undefined })),
    dispatchesSent: run.dispatchesSent?.map((item: any) => ({ ...item, dependencies: parseJson(item.dependenciesJson, []), onSuccess: parseJson(item.onSuccessJson, {}), context: parseJson(item.contextJson, {}), dependenciesJson: undefined, onSuccessJson: undefined, contextJson: undefined,
      resultRun: item.resultRun ? { ...item.resultRun, report: item.resultRun.report ? presentReport(item.resultRun.report) : null } : null })),
    managementConversation: run.managementConversation ? { ...run.managementConversation, messages: run.managementConversation.messages?.map((message: any) => ({ ...message, content: repairLegacyEncodingLoss(message.content), references: parseJson(message.referencesJson, []), referencesJson: undefined })) } : run.managementConversation,
    report: run.report ? presentReport(run.report) : run.logs ? deriveRunReport(run) : undefined, journey: run.logs ? deriveJourney(run) : undefined };
}

export async function requireRun(runId: string) {
  const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: runDetailInclude });
  if (!run) throw new ApiError(404, "Execução de agente não encontrada.");
  return run;
}
