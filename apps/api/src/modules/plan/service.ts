import { prisma } from "@carro-chefe/database";
import { parseJson } from "../../lib/errors";

export const taskInclude = {
  pillar: true,
  milestone: true,
  owner: true,
  dependsOn: { include: { dependency: { select: { id: true, title: true, status: true } } } },
  transitions: { orderBy: { createdAt: "desc" as const } },
  runs: { orderBy: { createdAt: "desc" as const }, take: 10 },
  questions: { orderBy: { createdAt: "desc" as const }, take: 20 },
  uploads: { orderBy: { createdAt: "desc" as const } }
};

export function presentTask(task: any) {
  return {
    ...task,
    evidence: parseJson(task.evidenceJson, []),
    dependencies: task.dependsOn?.map((item: any) => item.dependency) ?? [],
    evidenceJson: undefined,
    dependsOn: undefined
  };
}

export async function getBootstrap() {
  const [project, tasks, decisions, risks, procurement, runs, pendingQuestions] = await Promise.all([
    prisma.project.findUnique({ where: { id: "carro-chefe" }, include: {
      pillars: { orderBy: { order: "asc" } }, milestones: { orderBy: { order: "asc" } }, agents: { orderBy: { order: "asc" } }
    }}),
    prisma.task.findMany({ include: taskInclude, orderBy: [{ impact: "desc" }, { urgency: "desc" }] }),
    prisma.decision.findMany({ orderBy: { id: "asc" } }),
    prisma.risk.findMany({ orderBy: [{ impact: "desc" }, { probability: "desc" }] }),
    prisma.procurementItem.findMany({ orderBy: { id: "asc" } }),
    prisma.agentRun.findMany({ include: { task: { select: { id: true, title: true } }, agent: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.agentQuestion.count({ where: { status: "pending" } })
  ]);
  return { project, tasks: tasks.map(presentTask), decisions, risks, procurement: procurement.map((item) => ({
    ...item,
    requirements: parseJson(item.requirementsJson, []),
    options: parseJson(item.optionsJson, []),
    requirementsJson: undefined,
    optionsJson: undefined
  })), runs, pendingQuestions };
}

export async function getLegacyPlan() {
  const data = await getBootstrap();
  if (!data.project) return null;
  return {
    meta: { project: data.project.name, tagline: data.project.tagline, version: data.project.version,
      updatedAt: data.project.updatedAt, timezone: data.project.timezone, site: data.project.site,
      instagram: data.project.instagram, whatsapp: data.project.whatsapp, stage: data.project.stage, northStar: data.project.northStar },
    pillars: data.project.pillars.map((p) => ({ id: p.id, name: p.name, color: p.color, objective: p.description })),
    agents: data.project.agents.map((a) => ({ id: a.id, name: a.name, mission: a.mission })),
    milestones: data.project.milestones,
    tasks: data.tasks.map((t: any) => ({ id: t.id, title: t.title, pillar: t.pillarId, phase: t.milestoneId,
      owner: t.ownerAgentId, impact: t.impact, urgency: t.urgency, status: t.status,
      statusJustification: t.statusJustification, dependencies: t.dependencies.map((d: any) => d.id), acceptance: t.acceptance, evidence: t.evidence })),
    decisions: data.decisions.map((d) => ({ ...d, owner: d.ownerAgentId })),
    risks: data.risks.map((risk) => ({ ...risk, owner: risk.ownerAgentId })),
    procurement: data.procurement.map((item: any) => ({ ...item, owner: item.ownerAgentId })),
    notes: await prisma.note.findMany({ orderBy: { id: "asc" } }),
    history: await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
  };
}
