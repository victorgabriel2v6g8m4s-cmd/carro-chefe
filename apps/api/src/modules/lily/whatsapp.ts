import crypto from "node:crypto";
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
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
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
    const accountOptIn = candidate.order.userId ? accountWhatsAppOptIns.get(candidate.order.userId) : undefined;
    if (!candidate.order.whatsappUpdatesOptIn || accountOptIn === false) {
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

  // Public Meta webhook. This route intentionally lives under /api/v1/integrations/
  // because the global request-trust hook exempts only signed integration webhooks.
  app.get("/api/v1/integrations/whatsapp/webhook", async (request, reply) => {
    const query = z.object({
      "hub.mode": z.string().optional(),
      "hub.verify_token": z.string().optional(),
      "hub.challenge": z.string().optional()
    }).passthrough().parse(request.query);
    const expected = env("COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    if (!expected) return reply.code(503).send({ error: "Webhook WhatsApp ainda não configurado." });
    const supplied = query["hub.verify_token"] ?? "";
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);
    const valid = expectedBytes.length === suppliedBytes.length
      && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
    if (query["hub.mode"] !== "subscribe" || !valid || !query["hub.challenge"]) {
      return reply.code(403).send({ error: "Verificação de webhook recusada." });
    }
    return reply.type("text/plain; charset=utf-8").send(query["hub.challenge"]);
  });

  app.post("/api/v1/integrations/whatsapp/webhook", {
    config: { rateLimit: { max: 300, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const appSecret = env("COOKLILY_WHATSAPP_APP_SECRET");
    if (!appSecret) return reply.code(503).send({ error: "Webhook WhatsApp ainda não configurado." });
    const rawBody = request.rawBody;
    const signature = request.headers["x-hub-signature-256"];
    if (!rawBody || typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(signature)) {
      return reply.code(401).send({ error: "Assinatura de webhook ausente ou inválida." });
    }
    const expectedSignature = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
    const expectedBytes = Buffer.from(expectedSignature);
    const suppliedBytes = Buffer.from(signature);
    if (expectedBytes.length !== suppliedBytes.length || !crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
      return reply.code(401).send({ error: "Assinatura de webhook inválida." });
    }

    const body = request.body as {
      entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[]; statuses?: unknown[] } }> }>;
    };
    const records: Array<{ kind: string; item: Record<string, unknown> }> = [];
    for (const entry of body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const item of value.messages ?? []) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            records.push({ kind: "message.received", item: item as Record<string, unknown> });
          }
        }
        for (const item of value.statuses ?? []) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const statusItem = item as Record<string, unknown>;
            const status = typeof statusItem.status === "string" ? statusItem.status : "unknown";
            records.push({ kind: `message.status.${status.slice(0, 40)}`, item: statusItem });
          }
        }
      }
    }

    const receivedAt = new Date();
    for (const record of records) {
      const serialized = JSON.stringify(record.item);
      const payloadHash = crypto.createHash("sha256").update(serialized).digest("hex");
      const dedupeKey = crypto.createHash("sha256").update(record.kind + ":" + serialized).digest("hex");
      const providerMessageId = typeof record.item.id === "string"
        ? record.item.id.slice(0, 200)
        : null;
      const providerStatus = typeof record.item.status === "string"
        ? record.item.status.slice(0, 40)
        : null;
      await lilyPrisma.lilyWhatsAppWebhookEvent.upsert({
        where: { dedupeKey },
        update: {},
        create: {
          dedupeKey,
          eventType: record.kind,
          providerMessageId,
          providerStatus,
          payloadHash,
          receivedAt
        }
      });
    }

    // Deliberately do not persist message text, contact phone numbers or the raw webhook body.
    return reply.code(200).send({ received: true, events: records.length });
  });

  const templateInputSchema = z.object({
    key: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_]*$/),
    displayName: z.string().trim().min(2).max(120),
    category: z.enum(["utility", "marketing", "authentication"]).default("utility"),
    language: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/).default("pt_BR"),
    bodyTemplate: z.string().trim().min(1).max(4000),
    variables: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    metaTemplateName: z.string().trim().min(1).max(512).regex(/^[a-z0-9_]+$/).optional().nullable(),
    status: z.enum(["draft", "active", "archived"]).default("draft")
  }).strict();

  app.get("/api/v1/lily/admin/whatsapp/templates", async (request) => {
    await requireLilyStaff(request);
    const query = z.object({
      status: z.enum(["draft", "active", "archived"]).optional(),
      category: z.enum(["utility", "marketing", "authentication"]).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100)
    }).parse(request.query);
    const rows = await lilyPrisma.lilyWhatsAppMessageTemplate.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {})
      },
      orderBy: [{ updatedAt: "desc" }],
      take: query.limit
    });
    return {
      templates: rows.map((row) => ({
        id: row.id,
        key: row.key,
        displayName: row.displayName,
        category: row.category,
        language: row.language,
        bodyTemplate: row.bodyTemplate,
        variables: JSON.parse(row.variablesJson),
        metaTemplateName: row.metaTemplateName,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }))
    };
  });

  app.post("/api/v1/lily/admin/whatsapp/templates", async (request, reply) => {
    const context = await requireLilyAdmin(request, true);
    const input = templateInputSchema.parse(request.body);
    if (input.status === "active" && !input.metaTemplateName) {
      throw new Error("Para ativar uma mensagem, informe o nome do template aprovado na Meta.");
    }
    const created = await lilyPrisma.lilyWhatsAppMessageTemplate.create({
      data: {
        key: input.key,
        displayName: input.displayName,
        category: input.category,
        language: input.language,
        bodyTemplate: input.bodyTemplate,
        variablesJson: JSON.stringify(input.variables),
        metaTemplateName: input.metaTemplateName ?? null,
        status: input.status,
        createdBy: context.user.id
      }
    });
    await auditLilyAdmin(context.user.id, "whatsapp.template.create", "whatsapp-template", created.id, {
      key: created.key,
      category: created.category,
      status: created.status
    });
    return reply.code(201).send({ template: {
      id: created.id, key: created.key, displayName: created.displayName, category: created.category,
      language: created.language, bodyTemplate: created.bodyTemplate, variables: input.variables,
      metaTemplateName: created.metaTemplateName, status: created.status, createdAt: created.createdAt,
      updatedAt: created.updatedAt
    } });
  });

  app.patch("/api/v1/lily/admin/whatsapp/templates/:id", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const patchSchema = templateInputSchema.partial().strict().refine((value) => Object.keys(value).length > 0, {
      message: "Informe ao menos um campo para atualizar."
    });
    const input = patchSchema.parse(request.body);
    const current = await lilyPrisma.lilyWhatsAppMessageTemplate.findUnique({ where: { id } });
    if (!current) return { error: "Template não encontrado." };
    const nextMetaName = input.metaTemplateName === undefined ? current.metaTemplateName : input.metaTemplateName;
    const nextStatus = input.status ?? current.status;
    if (nextStatus === "active" && !nextMetaName) {
      throw new Error("Para ativar uma mensagem, informe o nome do template aprovado na Meta.");
    }
    const updated = await lilyPrisma.lilyWhatsAppMessageTemplate.update({
      where: { id },
      data: {
        ...(input.key !== undefined ? { key: input.key } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate } : {}),
        ...(input.variables !== undefined ? { variablesJson: JSON.stringify(input.variables) } : {}),
        ...(input.metaTemplateName !== undefined ? { metaTemplateName: input.metaTemplateName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      }
    });
    await auditLilyAdmin(context.user.id, "whatsapp.template.update", "whatsapp-template", id, {
      changedFields: Object.keys(input),
      status: updated.status
    });
    return { template: {
      id: updated.id, key: updated.key, displayName: updated.displayName, category: updated.category,
      language: updated.language, bodyTemplate: updated.bodyTemplate, variables: JSON.parse(updated.variablesJson),
      metaTemplateName: updated.metaTemplateName, status: updated.status, createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    } };
  });

}
