import type { Prisma } from "@carro-chefe/database";

export async function findNextRoadmapTask(tx: Prisma.TransactionClient, completedTaskId: string) {
  const completed = await tx.task.findUnique({ where: { id: completedTaskId }, select: { milestone: { select: { order: true } } } });
  if (!completed) return null;
  const candidates = await tx.task.findMany({
    where: { id: { not: completedTaskId }, status: { notIn: ["done", "cancelled"] } },
    select: { id: true, title: true, acceptance: true, status: true, impact: true, urgency: true, ownerAgentId: true, milestone: { select: { id: true, name: true, order: true } }, dependsOn: { select: { dependency: { select: { status: true } } } } }
  });
  const ready = candidates.filter((task) => task.dependsOn.every((item) => item.dependency.status === "done"));
  return ready.sort((a, b) => {
    const aSameOrNext = a.milestone.order >= completed.milestone.order ? 0 : 1;
    const bSameOrNext = b.milestone.order >= completed.milestone.order ? 0 : 1;
    return aSameOrNext - bSameOrNext || a.milestone.order - b.milestone.order || (b.impact * b.urgency) - (a.impact * a.urgency);
  })[0] ?? null;
}

export function nextStepNotification(task: NonNullable<Awaited<ReturnType<typeof findNextRoadmapTask>>>) {
  return {
    type: "next_step",
    title: "Próximo passo sugerido",
    message: `${task.id} · ${task.title} — ${task.milestone.name}`,
    route: `/gestao/tarefas/${task.id}`
  };
}
