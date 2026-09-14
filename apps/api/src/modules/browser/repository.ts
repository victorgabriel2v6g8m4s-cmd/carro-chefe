import { prisma } from "@carro-chefe/database";
import { appendEvent } from "../../lib/outbox";

export function findBrowserRun(runId: string) {
  return prisma.agentRun.findUnique({ where: { id: runId }, include: { agent: { select: { browserEnabled: true } } } });
}

export async function browserRunExists(runId: string) {
  return Boolean(await prisma.agentRun.findUnique({ where: { id: runId }, select: { id: true } }));
}

export async function uploadExists(uploadId: string) {
  return Boolean(await prisma.upload.findUnique({ where: { id: uploadId }, select: { id: true } }));
}

export function listBrowserNavigations(filters: { runId?: string; taskId?: string }) {
  return prisma.browserNavigation.findMany({ where: filters, orderBy: { createdAt: "desc" }, take: 100 });
}

export function createBrowserNavigation(input: {
  runId: string;
  taskId: string;
  intentId: string | null;
  actor: string;
  targetType: string;
  target: string;
  title?: string | null;
  reason?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const navigation = await tx.browserNavigation.create({ data: { runId: input.runId, taskId: input.taskId, actor: input.actor, targetType: input.targetType,
      target: input.target, title: input.title, reason: input.reason } });
    await tx.agentCommunication.create({ data: { runId: input.runId, intentId: input.intentId, sourceId: input.actor, targetId: "PROPRIETARIO", kind: "update", summary: `Navegador: ${input.title || input.target}` } });
    const event = await appendEvent(tx, "browser.navigation.requested", "agent_run", input.runId, navigation);
    return { navigation, event };
  });
}

export function markBrowserNavigationOpened(navigationId: string) {
  return prisma.$transaction(async (tx) => {
    const navigation = await tx.browserNavigation.update({ where: { id: navigationId }, data: { status: "opened", openedAt: new Date() } });
    const event = await tx.outboxEvent.create({ data: { topic: "browser.navigation.opened", aggregateType: "agent_run", aggregateId: navigation.runId, payloadJson: JSON.stringify(navigation) } });
    return { navigation, event };
  });
}
