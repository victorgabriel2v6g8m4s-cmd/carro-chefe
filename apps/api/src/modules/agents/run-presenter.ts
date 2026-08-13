import { prisma } from "@carro-chefe/database";
import { ApiError, parseJson } from "../../lib/errors";
import { repairMojibake } from "../../lib/text";
import { deriveJourney, deriveRunReport, presentReport } from "./diagnostics";

export const runInclude = { task: { select: { id: true, title: true, status: true, statusJustification: true, acceptance: true, evidenceJson: true } }, agent: true,
  intent: { select: { id: true, subject: true, summary: true, status: true, uploads: { orderBy: { createdAt: "asc" as const } } } },
  steps: { orderBy: { order: "asc" as const } }, messages: { orderBy: { createdAt: "asc" as const } }, questions: { orderBy: { createdAt: "desc" as const } }, usage: { orderBy: { createdAt: "asc" as const } } };
export const runDetailInclude = { ...runInclude, report: true, communications: { orderBy: { createdAt: "asc" as const } }, logs: { orderBy: { sequence: "desc" as const }, take: 500 } };

export function presentRun(run: any) {
  return { ...run,
    logs: run.logs ? [...run.logs].reverse().map((log: any) => ({ ...log, title: log.title ? repairMojibake(log.title) : log.title, content: repairMojibake(log.content) })) : undefined,
    questions: run.questions?.map((question: any) => ({ ...question, options: parseJson(question.optionsJson, []), optionsJson: undefined })),
    communications: run.communications?.map((item: any) => ({ ...item, metadata: parseJson(item.metadataJson, {}), metadataJson: undefined })),
    report: run.report ? presentReport(run.report) : run.logs ? deriveRunReport(run) : undefined, journey: run.logs ? deriveJourney(run) : undefined };
}

export async function requireRun(runId: string) {
  const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: runDetailInclude });
  if (!run) throw new ApiError(404, "Execução de agente não encontrada.");
  return run;
}
