import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@lily-acai/database";
import { lilyPrisma } from "@lily-acai/database";
import { z } from "zod";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";

type DbClient = Prisma.TransactionClient | PrismaClient;

export const LILY_WHATSAPP_CONSENT_VERSION = "2026-09-29";

export const LILY_WHATSAPP_STAGES = [
  "awaiting_payment",
  "payment_confirmed",
  "preparing",
  "ready_for_pickup",
  "waiting_courier",
  "courier_accepted",
  "picked_up",
  "out_for_delivery",
  "arrived_delivery",
  "delivered",
  "cancelled",
  "refunded"
] as const;

export type LilyWhatsAppStage = typeof LILY_WHATSAPP_STAGES[number];

const STAGE_LABELS: Record<LilyWhatsAppStage, string> = {
  awaiting_payment: "pedido recebido — aguardando pagamento",
  payment_confirmed: "pagamento confirmado",
  preparing: "pedido em preparo",
  ready_for_pickup: "pedido pronto para retirada",
  waiting_courier: "pedido pronto — aguardando entregador",
  courier_accepted: "entregador a caminho da coleta",
  picked_up: "pedido coletado",
  out_for_delivery: "pedido saiu para entrega",
  arrived_delivery: "entregador chegou ao endereço",
  delivered: "pedido entregue",
  cancelled: "pedido cancelado",
  refunded: "pagamento estornado"
};

const MAX_ATTEMPTS = 8;
const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 8_000;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function safeErrorMessage(input: unknown) {
  const text = input instanceof Error ? input.message : String(input ?? "erro desconhecido");
  return text.replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]").slice(0, 300);
}

export function lilyWhatsAppConfiguration() {
  const provider = env("COOKLILY_WHATSAPP_PROVIDER") || "disabled";
  const accessTokenConfigured = Boolean(env("COOKLILY_WHATSAPP_ACCESS_TOKEN"));
  const phoneNumberIdConfigured = Boolean(env("COOKLILY_WHATSAPP_PHONE_NUMBER_ID"));
  const graphVersion = env("COOKLILY_WHATSAPP_GRAPH_VERSION");
  const graphVersionConfigured = /^v\d+\.\d+$/.test(graphVersion);
  const templateName = env("COOKLILY_WHATSAPP_TEMPLATE_NAME");
  const templateConfigured = /^[a-z0-9_]{1,512}$/.test(templateName);
  const language = env("COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE") || "pt_BR";
  const languageConfigured = /^[a-z]{2}_[A-Z]{2}$/.test(language);
  const supported = provider === "disabled" || provider === "meta_cloud";

  return {
    provider,
    supported,
    accessTokenConfigured,
    phoneNumberIdConfigured,
    graphVersionConfigured,
    templateConfigured,
    languageConfigured,
    ready: provider === "meta_cloud"
      && supported
      && accessTokenConfigured
      && phoneNumberIdConfigured
      && graphVersionConfigured
      && templateConfigured
      && languageConfigured
  };
}

export async function enqueueLilyWhatsAppStage(
  db: DbClient,
  input: {
    orderId: string;
    optedIn: boolean;
    stage: LilyWhatsAppStage;
    at?: Date;
  }
) {
  if (!input.optedIn) return null;
  const at = input.at ?? new Date();
  return db.lilyWhatsAppNotification.upsert({
    where: {
      orderId_stage: {
        orderId: input.orderId,
        stage: input.stage
      }
    },
    update: {},
    create: {
      orderId: input.orderId,
      stage: input.stage,
      status: "pending",
      nextAttemptAt: at
    }
  });
}

async function sendMetaTemplate(input: {
  phoneNormalized: string;
  orderNumber: string;
  stage: LilyWhatsAppStage;
  fetchImpl?: typeof fetch;
}) {
  const configuration = lilyWhatsAppConfiguration();
  if (!configuration.ready) {
    throw new Error("WhatsApp Meta Cloud API não está configurado.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const accessToken = env("COOKLILY_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("COOKLILY_WHATSAPP_PHONE_NUMBER_ID");
  const graphVersion = env("COOKLILY_WHATSAPP_GRAPH_VERSION");
  const templateName = env("COOKLILY_WHATSAPP_TEMPLATE_NAME");
  const language = env("COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE") || "pt_BR";
  const timeoutRaw = Number(process.env.COOKLILY_WHATSAPP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw)
    ? Math.min(15_000, Math.max(1_000, Math.round(timeoutRaw)))
    : DEFAULT_TIMEOUT_MS;

  const response = await fetchImpl(
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.phoneNormalized.replace(/\D/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: input.orderNumber },
              { type: "text", text: STAGE_LABELS[input.stage] }
            ]
          }]
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    }
  );

  let body: any = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const code = body?.error?.code ? String(body.error.code) : `HTTP_${response.status}`;
    const error = new Error(typeof body?.error?.message === "string"
      ? body.error.message
      : "Falha ao enviar template WhatsApp.");
    (error as Error & { code?: string }).code = code;
    throw error;
  }

  const providerMessageId = typeof body?.messages?.[0]?.id === "string"
    ? body.messages[0].id
    : null;
  if (!providerMessageId) {
    const error = new Error("Meta Cloud API não retornou message id.");
    (error as Error & { code?: string }).code = "META_MESSAGE_ID_MISSING";
    throw error;
  }

  return { providerMessageId };
}

function retryDelayMs(attempt: number) {
  const seconds = Math.min(3600, 15 * (2 ** Math.max(0, attempt - 1)));
  return seconds * 1000;
}

export async function processLilyWhatsAppQueue(limit = 20) {
  const configuration = lilyWhatsAppConfiguration();
  if (!configuration.ready) {
    return { processed: 0, sent: 0, failed: 0, dead: 0, ready: false };
  }

  const now = new Date();
  const staleProcessingBefore = new Date(now.getTime() - 5 * 60_000);
  await lilyPrisma.lilyWhatsAppNotification.updateMany({
    where: {
      status: "processing",
      updatedAt: { lte: staleProcessingBefore },
      attempts: { lt: MAX_ATTEMPTS }
    },
    data: {
      status: "failed",
      nextAttemptAt: now,
      lastErrorCode: "STALE_PROCESSING",
      lastErrorMessage: "Processamento anterior interrompido; reprogramado automaticamente."
    }
  });

  const candidates = await lilyPrisma.lilyWhatsAppNotification.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      nextAttemptAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS }
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(100, Math.max(1, limit)),
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          phoneNormalized: true,
          userId: true,
          whatsappUpdatesOptIn: true
        }
      }
    }
  });

  const accountIds = [...new Set(candidates.map((candidate) => candidate.order.userId).filter((id): id is string => Boolean(id)))];
  const accountPreferenceRecords = accountIds.length
    ? await lilyPrisma.lilyConsentRecord.findMany({
        where: { userId: { in: accountIds }, purpose: "whatsapp_order_updates" },
        orderBy: { recordedAt: "desc" },
        select: { userId: true, granted: true, recordedAt: true, revokedAt: true }
      })
    : [];
  const accountWhatsAppOptIns = new Map<string, boolean>();
  for (const preference of accountPreferenceRecords) {
    if (!accountWhatsAppOptIns.has(preference.userId)) {
      accountWhatsAppOptIns.set(preference.userId, preference.granted && !preference.revokedAt);
    }
  }

  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    const claimed = await lilyPrisma.lilyWhatsAppNotification.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        attempts: candidate.attempts,
        nextAttemptAt: candidate.nextAttemptAt
      },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        provider: "meta_cloud",
        lastErrorCode: null,
        lastErrorMessage: null
      }
    });
    if (claimed.count !== 1) continue;

    const attempt = candidate.attempts + 1;
    const accountOptIn = candidate.order.userId ? accountWhatsAppOptIns.get(candidate.order.userId) : undefined;\n    if (!candidate.order.whatsappUpdatesOptIn || accountOptIn === false) {
      await lilyPrisma.lilyWhatsAppNotification.update({
        where: { id: candidate.id },
        data: {
          status: "skipped",
          lastErrorCode: "OPT_OUT",
          lastErrorMessage: "Opt-in operacional não está ativo."
        }
      });
      continue;
    }

    try {
      const result = await sendMetaTemplate({
        phoneNormalized: candidate.order.phoneNormalized,
        orderNumber: candidate.order.orderNumber,
        stage: candidate.stage as LilyWhatsAppStage
      });
      await lilyPrisma.lilyWhatsAppNotification.update({
        where: { id: candidate.id },
        data: {
          status: "sent",
          provider: "meta_cloud",
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null
        }
      });
      sent += 1;
    } catch (error) {
      const terminal = attempt >= MAX_ATTEMPTS;
      await lilyPrisma.lilyWhatsAppNotification.update({
        where: { id: candidate.id },
        data: {
          status: terminal ? "dead" : "failed",
          nextAttemptAt: new Date(Date.now() + retryDelayMs(attempt)),
          lastErrorCode: typeof (error as any)?.code === "string"
            ? String((error as any).code).slice(0, 80)
            : "SEND_FAILED",
          lastErrorMessage: safeErrorMessage(error)
        }
      });
      if (terminal) dead += 1;
      else failed += 1;
    }
  }

  return {
    processed: candidates.length,
    sent,
    failed,
    dead,
    ready: true
  };
}

export function startLilyWhatsAppWorker(log?: {
  info?: (value: unknown) => void;
  error?: (value: unknown) => void;
}) {
  let running = false;
  let stopped = false;

  const tick = async () => {
    if (running || stopped || !lilyWhatsAppConfiguration().ready) return;
    running = true;
    try {
      const result = await processLilyWhatsAppQueue(20);
      if (result.processed > 0) {
        log?.info?.({
          event: "lily.whatsapp.worker",
          processed: result.processed,
          sent: result.sent,
          failed: result.failed,
          dead: result.dead
        });
      }
    } catch (error) {
      log?.error?.({
        event: "lily.whatsapp.worker_error",
        message: safeErrorMessage(error)
      });
    } finally {
      running = false;
    }
  };

  const intervalRaw = Number(process.env.COOKLILY_WHATSAPP_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const intervalMs = Number.isFinite(intervalRaw)
    ? Math.min(300_000, Math.max(5_000, Math.round(intervalRaw)))
    : DEFAULT_INTERVAL_MS;

  const startup = setTimeout(() => { void tick(); }, 1_000);
  const interval = setInterval(() => { void tick(); }, intervalMs);
  startup.unref?.();
  interval.unref?.();

  return () => {
    stopped = true;
    clearTimeout(startup);
    clearInterval(interval);
  };
}

export async function lilyWhatsAppRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/whatsapp/settings", async (request) => {
    await requireLilyStaff(request);
    const configuration = lilyWhatsAppConfiguration();
    const [pending, failed, dead] = await Promise.all([
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "pending" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "failed" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "dead" } })
    ]);
    return {
      provider: configuration.provider,
      supported: configuration.supported,
      ready: configuration.ready,
      credentials: {
        accessTokenConfigured: configuration.accessTokenConfigured,
        phoneNumberIdConfigured: configuration.phoneNumberIdConfigured,
        graphVersionConfigured: configuration.graphVersionConfigured,
        templateConfigured: configuration.templateConfigured,
        languageConfigured: configuration.languageConfigured
      },
      queue: { pending, failed, dead },
      consentVersion: LILY_WHATSAPP_CONSENT_VERSION
    };
  });

  app.get("/api/v1/lily/admin/whatsapp/notifications", async (request) => {
    await requireLilyStaff(request);
    const query = z.object({
      status: z.enum(["pending", "processing", "sent", "failed", "dead", "skipped"]).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100)
    }).parse(request.query);

    const rows = await lilyPrisma.lilyWhatsAppNotification.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: { order: { select: { orderNumber: true } } }
    });
    return {
      notifications: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order.orderNumber,
        stage: row.stage,
        status: row.status,
        attempts: row.attempts,
        provider: row.provider,
        providerMessageId: row.providerMessageId,
        lastErrorCode: row.lastErrorCode,
        lastErrorMessage: row.lastErrorMessage,
        nextAttemptAt: row.nextAttemptAt,
        sentAt: row.sentAt,
        createdAt: row.createdAt
      }))
    };
  });

  app.post("/api/v1/lily/admin/whatsapp/retry", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = z.object({
      notificationId: z.string().trim().min(1).max(120).optional()
    }).strict().parse(request.body ?? {});

    const where = input.notificationId
      ? { id: input.notificationId, status: { in: ["failed", "dead"] } }
      : { status: { in: ["failed", "dead"] } };

    const reset = await lilyPrisma.lilyWhatsAppNotification.updateMany({
      where,
      data: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null
      }
    });

    await auditLilyAdmin(context.user.id, "whatsapp.retry", "whatsapp-notification", input.notificationId ?? null, {
      count: reset.count
    });

    return { retried: reset.count };
  });
}
