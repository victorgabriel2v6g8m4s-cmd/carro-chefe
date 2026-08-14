import { prisma } from "@carro-chefe/database";
import { parseJson } from "../../lib/errors";

export type ScopedReference = {
  id: string;
  type: "task" | "decision" | "risk" | "procurement" | "upload" | "run" | "file" | "url";
  label: string;
  detail?: string;
  route?: string;
};

function includesQuery(reference: ScopedReference, query: string) {
  const haystack = `${reference.id} ${reference.label} ${reference.detail ?? ""}`.toLocaleLowerCase("pt-BR");
  return !query || haystack.includes(query);
}

function uploadReference(upload: { id: string; originalName: string; actor: string }): ScopedReference {
  return { id: upload.id, type: "upload", label: upload.originalName, detail: `Arquivo enviado por ${upload.actor}`, route: `/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}` };
}

export async function getScopedReferences(taskId?: string, rawQuery = "", rawLimit = 80) {
  const query = rawQuery.trim().toLocaleLowerCase("pt-BR");
  const limit = Math.max(1, Math.min(150, rawLimit || 80));
  const task = taskId ? await prisma.task.findUnique({ where: { id: taskId }, include: {
    dependsOn: { include: { dependency: true } }, dependents: { include: { task: true } },
    uploads: { orderBy: { createdAt: "desc" }, take: 30 },
    runs: { include: { uploads: { orderBy: { createdAt: "desc" }, take: 15 } }, orderBy: { createdAt: "desc" }, take: 15 }
  } }) : null;

  const ownerAgentId = task?.ownerAgentId;
  const [tasks, decisions, risks, procurement, uploads, runs] = await Promise.all([
    task ? Promise.resolve([]) : prisma.task.findMany({ orderBy: { updatedAt: "desc" }, take: 60 }),
    prisma.decision.findMany({ where: ownerAgentId ? { ownerAgentId } : undefined, orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.risk.findMany({ where: ownerAgentId ? { ownerAgentId } : undefined, orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.procurementItem.findMany({ where: ownerAgentId ? { ownerAgentId } : undefined, orderBy: { updatedAt: "desc" }, take: 40 }),
    task ? Promise.resolve([]) : prisma.upload.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    task ? Promise.resolve([]) : prisma.agentRun.findMany({ orderBy: { createdAt: "desc" }, take: 30 })
  ]);

  const references: ScopedReference[] = [];
  if (task) {
    references.push({ id: task.id, type: "task", label: task.title, detail: `Tarefa atual · ${task.status}`, route: `/gestao/tarefas/${task.id}` });
    for (const edge of task.dependsOn) references.push({ id: edge.dependency.id, type: "task", label: edge.dependency.title, detail: `Dependência · ${edge.dependency.status}`, route: `/gestao/tarefas/${edge.dependency.id}` });
    for (const edge of task.dependents) references.push({ id: edge.task.id, type: "task", label: edge.task.title, detail: `Tarefa dependente · ${edge.task.status}`, route: `/gestao/tarefas/${edge.task.id}` });
    for (const evidence of parseJson<string[]>(task.evidenceJson, [])) references.push({ id: evidence, type: /^https?:\/\//i.test(evidence) ? "url" : "file", label: evidence.split(/[\\/]/).at(-1) || evidence, detail: "Evidência da tarefa", route: /^https?:\/\//i.test(evidence) ? `/gestao/navegador?url=${encodeURIComponent(evidence)}` : `/gestao/visualizador?path=${encodeURIComponent(evidence)}` });
    references.push(...task.uploads.map(uploadReference));
    for (const run of task.runs) {
      references.push({ id: run.id, type: "run", label: run.title, detail: `Execução · ${run.status}`, route: `/gestao/agentes/execucoes/${run.id}` });
      references.push(...run.uploads.map(uploadReference));
    }
  }
  for (const item of tasks) references.push({ id: item.id, type: "task", label: item.title, detail: `Tarefa · ${item.status}`, route: `/gestao/tarefas/${item.id}` });
  for (const item of decisions) references.push({ id: item.id, type: "decision", label: item.question, detail: `Decisão · ${item.status}`, route: `/gestao/governanca#decision-${item.id}` });
  for (const item of risks) references.push({ id: item.id, type: "risk", label: item.title, detail: `Risco · ${item.status}`, route: "/gestao/governanca" });
  for (const item of procurement) references.push({ id: item.id, type: "procurement", label: item.item, detail: `Compra · ${item.status}`, route: "/gestao/compras" });
  references.push(...uploads.map(uploadReference));
  for (const run of runs) references.push({ id: run.id, type: "run", label: run.title, detail: `Execução · ${run.status}`, route: `/gestao/agentes/execucoes/${run.id}` });

  return [...new Map(references.map((reference) => [`${reference.type}:${reference.id}`, reference])).values()]
    .filter((reference) => includesQuery(reference, query)).slice(0, limit);
}

export async function resolveReferenceContext(ids: string[], taskId?: string | null) {
  if (!ids.length) return [];
  const scoped = await getScopedReferences(taskId ?? undefined, "", 150);
  const project = taskId ? await getScopedReferences(undefined, "", 150) : [];
  const selected = new Set(ids);
  return [...new Map([...scoped, ...project].map((reference) => [`${reference.type}:${reference.id}`, reference])).values()]
    .filter((reference) => selected.has(reference.id)).map(({ id, type, label, detail, route }) => ({ id, type, label, detail, route }));
}
