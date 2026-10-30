import { lilyPrisma } from "@lily-acai/database";
import { lilyWhatsAppAIConfiguration } from "./config";
import { decryptWhatsAppPrivateValue, encryptWhatsAppPrivateValue } from "./crypto";
import { retrievePublicWhatsAppKnowledge } from "./knowledge";
import { validateAssistantReply } from "./guardrails";
import { createStatelessAssistantReply, sendWhatsAppSessionText } from "./providers";

const MAX_ATTEMPTS = 3;
const DEFAULT_INTERVAL_MS = 5_000;
const LEASE_MS = 30_000;

type WorkerLog = { info?: (data: unknown) => void; error?: (data: unknown) => void };

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  return /^[A-Z0-9_]{1,80}$/.test(message) ? message : "WHATSAPP_AI_PROCESSING_FAILED";
}

async function claimNextJob() {
  const now = new Date();
  const job = await lilyPrisma.lilyWhatsAppAIJob.findFirst({
    where: {
      status: { in: ["pending", "failed", "processing"] },
      nextAttemptAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      conversation: { status: "ai", expiresAt: { gt: now }, windowExpiresAt: { gt: now } }
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }]
  });
  if (!job) return null;
  const claimed = await lilyPrisma.lilyWhatsAppAIJob.updateMany({
    where: { id: job.id, status: job.status, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    data: { status: "processing", attempts: { increment: 1 }, leaseUntil: new Date(now.getTime() + LEASE_MS) }
  });
  return claimed.count === 1 ? { ...job, attempts: job.attempts + 1 } : null;
}

async function handoff(jobId: string, conversationId: string, code: string) {
  await lilyPrisma.$transaction([
    lilyPrisma.lilyWhatsAppAIJob.update({ where: { id: jobId }, data: { status: "dead", leaseUntil: null, lastErrorCode: code.slice(0, 80) } }),
    lilyPrisma.lilyWhatsAppConversation.update({ where: { id: conversationId }, data: { status: "human" } })
  ]);
}

async function processJob(job: { id: string; messageId: string; conversationId: string; attempts: number }) {
  const configuration = lilyWhatsAppAIConfiguration();
  if (!configuration.enabled) {
    await handoff(job.id, job.conversationId, "WHATSAPP_AI_DISABLED");
    return "handoff" as const;
  }
  const conversation = await lilyPrisma.lilyWhatsAppConversation.findUnique({
    where: { id: job.conversationId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 8 } }
  });
  if (!conversation || conversation.status !== "ai" || !conversation.windowExpiresAt || conversation.windowExpiresAt <= new Date()) {
    await handoff(job.id, job.conversationId, "WHATSAPP_SESSION_NOT_REPLYABLE");
    return "handoff" as const;
  }
  const currentMessage = conversation.messages.find((message) => message.id === job.messageId);
  if (!currentMessage || currentMessage.contentType !== "text") {
    await handoff(job.id, job.conversationId, "WHATSAPP_MESSAGE_TYPE_REQUIRES_HUMAN");
    return "handoff" as const;
  }
  if (currentMessage.direction !== "inbound") {
    await handoff(job.id, job.conversationId, "WHATSAPP_JOB_MESSAGE_DIRECTION_INVALID");
    return "handoff" as const;
  }
  const userText = decryptWhatsAppPrivateValue(currentMessage.bodyCiphertext);
  const retrieval = await retrievePublicWhatsAppKnowledge(userText);
  if (!retrieval.articles.length) {
    await handoff(job.id, job.conversationId, "WHATSAPP_KNOWLEDGE_CONFIDENCE_LOW");
    return "handoff" as const;
  }
  const reply = await createStatelessAssistantReply({
    recentMessages: conversation.messages.reverse().map((message) => ({
      role: message.direction === "outbound" ? "assistant" as const : "user" as const,
      content: decryptWhatsAppPrivateValue(message.bodyCiphertext)
    })),
    publicContext: retrieval.context
  });
  const safeReply = validateAssistantReply(reply.text);
  if (!safeReply) {
    await handoff(job.id, job.conversationId, "WHATSAPP_AI_OUTPUT_REJECTED");
    return "handoff" as const;
  }
  const latest = await lilyPrisma.lilyWhatsAppConversation.findUnique({ where: { id: job.conversationId } });
  if (!latest || latest.status !== "ai" || !latest.windowExpiresAt || latest.windowExpiresAt <= new Date()) {
    await handoff(job.id, job.conversationId, "WHATSAPP_SESSION_NOT_REPLYABLE");
    return "handoff" as const;
  }
  const outgoing = await lilyPrisma.lilyWhatsAppConversationMessage.upsert({
    where: { idempotencyKey: `ai-job:${job.id}` },
    update: {},
    create: {
      conversationId: latest.id,
      idempotencyKey: `ai-job:${job.id}`,
      direction: "outbound",
      contentType: "text",
      bodyCiphertext: encryptWhatsAppPrivateValue(safeReply),
      status: "sending",
      expiresAt: latest.expiresAt
    }
  });
  if (outgoing.status !== "sending" || outgoing.providerMessageId) {
    await handoff(job.id, latest.id, "WHATSAPP_SEND_RESULT_REQUIRES_REVIEW");
    return "handoff" as const;
  }
  try {
    const providerMessageId = await sendWhatsAppSessionText({
      phoneE164: decryptWhatsAppPrivateValue(latest.contactCiphertext),
      text: safeReply
    });
    await lilyPrisma.$transaction([
      lilyPrisma.lilyWhatsAppConversationMessage.update({ where: { id: outgoing.id }, data: { providerMessageId, status: "sent" } }),
      lilyPrisma.lilyWhatsAppAIJob.update({ where: { id: job.id }, data: { status: "sent", leaseUntil: null, lastErrorCode: null } })
    ]);
    return "sent" as const;
  } catch (error) {
    await lilyPrisma.$transaction([
      lilyPrisma.lilyWhatsAppConversationMessage.update({ where: { id: outgoing.id }, data: { status: "unknown" } }),
      lilyPrisma.lilyWhatsAppAIJob.update({ where: { id: job.id }, data: { status: "dead", leaseUntil: null, lastErrorCode: errorCode(error) } }),
      lilyPrisma.lilyWhatsAppConversation.update({ where: { id: latest.id }, data: { status: "human" } })
    ]);
    return "handoff" as const;
  }
}

async function runNext(log: WorkerLog) {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    await processJob(job);
  } catch (error) {
    const code = errorCode(error);
    if (job.attempts >= MAX_ATTEMPTS || code === "OPENAI_DAILY_BUDGET_EXHAUSTED") {
      await handoff(job.id, job.conversationId, code);
    } else {
      await lilyPrisma.lilyWhatsAppAIJob.update({
        where: { id: job.id },
        data: { status: "failed", leaseUntil: null, lastErrorCode: code, nextAttemptAt: new Date(Date.now() + job.attempts * 30_000) }
      });
    }
    log.error?.({ event: "lily.whatsapp.ai_job_failed", code, attempt: job.attempts });
  }
  return true;
}

async function purgeExpiredData() {
  const now = new Date();
  const configuration = lilyWhatsAppAIConfiguration();
  if (!configuration.inboxReady) return;
  await lilyPrisma.lilyWhatsAppConversation.deleteMany({ where: { expiresAt: { lte: now } } });
  await lilyPrisma.lilyWhatsAppAIEmbeddingCache.deleteMany({ where: { expiresAt: { lte: now } } });
  await lilyPrisma.lilyWhatsAppAIResponseCache.deleteMany({ where: { expiresAt: { lte: now } } });
}

export function startLilyWhatsAppAIWorker(log: WorkerLog = {}) {
  let stopped = false;
  let running = false;
  let lastPurgeAt = 0;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      if (Date.now() - lastPurgeAt >= 60 * 60 * 1000) {
        await purgeExpiredData();
        lastPurgeAt = Date.now();
      }
      await runNext(log);
    } catch (error) {
      log.error?.({ event: "lily.whatsapp.ai_worker_error", code: errorCode(error) });
    } finally {
      running = false;
    }
  };
  const startup = setTimeout(() => { void tick(); }, 1_500);
  const interval = setInterval(() => { void tick(); }, DEFAULT_INTERVAL_MS);
  startup.unref?.();
  interval.unref?.();
  return () => { stopped = true; clearTimeout(startup); clearInterval(interval); };
}

