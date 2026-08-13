import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { configureSqlite, prisma } from "./index";

type LegacyPlan = Record<string, any>;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const runtimePlan = path.join(root, "planejamento", ".runtime", "plan.json");
const seedPlan = path.join(root, "planejamento", "data", "plan.seed.json");

async function exists(file: string) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function run() {
  await configureSqlite();
  const source = (await exists(runtimePlan)) ? runtimePlan : seedPlan;
  const sourceText = await fs.readFile(source, "utf8");
  const plan = JSON.parse(sourceText) as LegacyPlan;
  const projectId = "carro-chefe";
  const counts = Object.fromEntries(
    ["pillars", "milestones", "agents", "tasks", "decisions", "risks", "procurement", "notes"]
      .map((key) => [key, Array.isArray(plan[key]) ? plan[key].length : 0])
  );

  await prisma.$transaction(async (tx) => {
    await tx.project.upsert({
      where: { id: projectId },
      update: {
        name: plan.meta.project,
        tagline: plan.meta.tagline,
        version: plan.meta.version,
        stage: plan.meta.stage,
        timezone: plan.meta.timezone,
        site: plan.meta.site,
        instagram: plan.meta.instagram,
        whatsapp: plan.meta.whatsapp,
        northStar: plan.meta.northStar
      },
      create: {
        id: projectId,
        name: plan.meta.project,
        tagline: plan.meta.tagline,
        version: plan.meta.version,
        stage: plan.meta.stage,
        timezone: plan.meta.timezone,
        site: plan.meta.site,
        instagram: plan.meta.instagram,
        whatsapp: plan.meta.whatsapp,
        northStar: plan.meta.northStar
      }
    });

    for (const [order, pillar] of plan.pillars.entries()) {
      await tx.pillar.upsert({
        where: { id: pillar.id },
        update: { name: pillar.name, description: pillar.objective ?? null, color: pillar.color ?? null, order },
        create: { id: pillar.id, projectId, name: pillar.name, description: pillar.objective ?? null, color: pillar.color ?? null, order }
      });
    }
    for (const [order, milestone] of plan.milestones.entries()) {
      await tx.milestone.upsert({
        where: { id: milestone.id },
        update: { name: milestone.name, objective: milestone.objective, status: milestone.status, exitCriteria: milestone.exitCriteria, order },
        create: { id: milestone.id, projectId, name: milestone.name, objective: milestone.objective, status: milestone.status, exitCriteria: milestone.exitCriteria, order }
      });
    }
    const dataAgent = { id: "AG-DADOS", name: "Dados & Analytics", mission: "Governar contratos, qualidade, privacidade, eventos, analytics e reconciliação dos dados." };
    const configuredAgents = plan.agents.flatMap((agent: typeof dataAgent) => agent.id === "AG-DEV" ? [agent, dataAgent] : [agent]);
    for (const [order, agent] of configuredAgents.entries()) {
      const development = agent.id === "AG-DEV";
      const name = development ? "Development" : agent.name;
      const mission = development ? "Construir software, integrações, testes, deploy e observabilidade com escopo técnico explícito." : agent.mission;
      await tx.agentDefinition.upsert({
        where: { id: agent.id },
        update: { name, role: agent.id.replace("AG-", "").toLowerCase(), mission, order, reasoningEffort: "medium", browserEnabled: true },
        create: { id: agent.id, projectId, name, role: agent.id.replace("AG-", "").toLowerCase(), mission, order, reasoningEffort: "medium", browserEnabled: true }
      });
    }
    for (const task of plan.tasks) {
      await tx.task.upsert({
        where: { id: task.id },
        update: {
          title: task.title, pillarId: task.pillar, milestoneId: task.phase, ownerAgentId: task.id.startsWith("TASK-DAT-") ? "AG-DADOS" : task.owner,
          impact: task.impact, urgency: task.urgency, status: task.status, acceptance: task.acceptance,
          evidenceJson: JSON.stringify(task.evidence ?? [])
        },
        create: {
          id: task.id, projectId, title: task.title, pillarId: task.pillar, milestoneId: task.phase,
          ownerAgentId: task.id.startsWith("TASK-DAT-") ? "AG-DADOS" : task.owner, impact: task.impact, urgency: task.urgency, status: task.status,
          acceptance: task.acceptance, evidenceJson: JSON.stringify(task.evidence ?? [])
        }
      });
    }
    for (const task of plan.tasks) {
      await tx.taskDependency.deleteMany({ where: { taskId: task.id } });
      for (const dependencyId of task.dependencies ?? []) {
        await tx.taskDependency.create({ data: { taskId: task.id, dependencyId } });
      }
    }
    for (const decision of plan.decisions) {
      await tx.decision.upsert({ where: { id: decision.id }, update: {
        question: decision.question, ownerAgentId: decision.owner, due: decision.due, status: decision.status,
        recommendation: decision.recommendation, resolution: decision.resolution
      }, create: { id: decision.id, projectId, question: decision.question, ownerAgentId: decision.owner,
        due: decision.due, status: decision.status, recommendation: decision.recommendation, resolution: decision.resolution } });
    }
    for (const risk of plan.risks) {
      await tx.risk.upsert({ where: { id: risk.id }, update: { title: risk.title, ownerAgentId: risk.owner,
        probability: risk.probability, impact: risk.impact, status: risk.status, mitigation: risk.mitigation, trigger: risk.trigger },
      create: { id: risk.id, projectId, title: risk.title, ownerAgentId: risk.owner, probability: risk.probability,
        impact: risk.impact, status: risk.status, mitigation: risk.mitigation, trigger: risk.trigger } });
    }
    for (const item of plan.procurement) {
      await tx.procurementItem.upsert({ where: { id: item.id }, update: { item: item.item, category: item.category,
        ownerAgentId: item.owner, status: item.status, neededBy: item.neededBy,
        requirementsJson: JSON.stringify(item.requirements ?? []), budgetCeilingJson: JSON.stringify(item.budgetCeiling),
        recommendation: item.recommendation, optionsJson: JSON.stringify(item.options ?? []) }, create: { id: item.id, projectId,
        item: item.item, category: item.category, ownerAgentId: item.owner, status: item.status, neededBy: item.neededBy,
        requirementsJson: JSON.stringify(item.requirements ?? []), budgetCeilingJson: JSON.stringify(item.budgetCeiling),
        recommendation: item.recommendation, optionsJson: JSON.stringify(item.options ?? []) } });
    }
    for (const note of plan.notes) {
      await tx.note.upsert({ where: { id: note.id }, update: { title: note.title, content: note.content, ownerAgentId: note.owner },
        create: { id: note.id, projectId, title: note.title, content: note.content, ownerAgentId: note.owner,
          createdAt: note.createdAt ? new Date(note.createdAt) : undefined } });
    }
    if (await tx.auditEvent.count() === 0) {
      for (const event of plan.history ?? []) {
        await tx.auditEvent.create({ data: { actor: event.actor, action: event.action, entityType: "project",
          entityId: projectId, summary: event.summary, createdAt: new Date(event.at) } });
      }
    }
    const hash = crypto.createHash("sha256").update(sourceText).digest("hex");
    if (!await tx.importBatch.findFirst({ where: { sourceHash: hash } })) {
      await tx.importBatch.create({ data: { source: path.relative(root, source), sourceHash: hash, countsJson: JSON.stringify(counts) } });
    }
  });
  console.log(`Plano importado para SQLite: ${JSON.stringify(counts)}`);
}

run().finally(() => prisma.$disconnect());
