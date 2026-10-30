import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@lily-acai/database";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { z } from "zod";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { LILY_WHATSAPP_STARTER_TEMPLATES } from "./whatsapp-template-presets";

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

export function verifyLilyWhatsAppWebhookToken(supplied: string, expected: string) {
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length
    && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

export function verifyLilyWhatsAppWebhookSignature(rawBody: string, signature: string, appSecret: string) {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(signature);
  return expectedBytes.length === suppliedBytes.length
    && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
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

export function assertWhatsAppTemplateCanActivate(
  status: string,
  metaTemplateName: string | null | undefined,
  operational?: { key: string; category: string; components: Array<{ type?: unknown }> }
) {
  if (status === "active" && !metaTemplateName) {
    throw new ApiError(400, "Para ativar uma mensagem, informe o nome do template aprovado na Meta.", { code: "WHATSAPP_TEMPLATE_META_NAME_REQUIRED" });
  }
  if (status === "active" && operational && (
    !LILY_WHATSAPP_STAGES.includes(operational.key as LilyWhatsAppStage)
    || operational.category !== "utility"
    || operational.components.some((component) => !["BODY", "FOOTER"].includes(String(component.type)))
  )) {
    throw new ApiError(400, "Somente templates de utilidade vinculados a uma etapa do pedido e com corpo/rodapé podem ser ativados para notificações operacionais.", { code: "WHATSAPP_TEMPLATE_NOT_OPERATIONAL" });
  }
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
  const registeredTemplate = await lilyPrisma.lilyWhatsAppMessageTemplate.findFirst({
    where: { key: input.stage, status: "active" }
  });
  const templateName = registeredTemplate?.metaTemplateName || env("COOKLILY_WHATSAPP_TEMPLATE_NAME");
  const language = registeredTemplate?.language || env("COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE") || "pt_BR";
  const templateVariables = registeredTemplate ? JSON.parse(registeredTemplate.variablesJson) as string[] : ["orderNumber", "stageLabel"];
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
            parameters: templateVariables.map((variable) => {
              if (variable === "orderNumber") return { type: "text", text: input.orderNumber };
              if (variable === "stageLabel") return { type: "text", text: STAGE_LABELS[input.stage] };
              throw new Error(`Variável WhatsApp não suportada: ${variable}`);
            })
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
    const [pending, failed, dead, templates] = await Promise.all([
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "pending" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "failed" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "dead" } }),
      lilyPrisma.lilyWhatsAppMessageTemplate.count()
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
      templates: { total: templates, operationalStages: LILY_WHATSAPP_STAGES },
      webhook: {
        verifyTokenConfigured: Boolean(env("COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN")),
        appSecretConfigured: Boolean(env("COOKLILY_WHATSAPP_APP_SECRET"))
      },
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

  function isBoundedJson(value: unknown, depth = 0): boolean {
    if (depth > 8) return false;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
    if (Array.isArray(value)) return value.length <= 100 && value.every((item) => isBoundedJson(item, depth + 1));
    if (typeof value !== "object") return false;
    const entries = Object.entries(value);
    return entries.length <= 80 && entries.every(([key, item]) => key.length <= 120 && isBoundedJson(item, depth + 1));
  }

  const metaComponentsSchema = z.array(z.record(z.string(), z.unknown())
    .refine((component) => typeof component.type === "string" && /^[A-Z_]{2,40}$/.test(component.type), "Componente Meta precisa informar um type válido.")
    .refine((component) => isBoundedJson(component) && JSON.stringify(component).length <= 8000, "Componente Meta excede os limites de estrutura ou tamanho.")
  ).max(10).refine((components) => JSON.stringify(components).length <= 24000, "A lista de componentes Meta excede 24 KB.");

  const flowNodeSchema = z.object({
    id: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(120),
    trigger: z.enum(["início", "texto contém: status", "botão selecionado", "manual"]),
    templateKey: z.string().max(80), response: z.string().max(500), nextNodeId: z.string().max(80),
      branches: z.array(z.object({ id: z.string().min(1).max(80), trigger: z.enum(["texto", "botão", "qualquer resposta"]), response: z.string().max(500), nextNodeId: z.string().max(80) }).strict()).max(30).optional()
  }).strict();
  const templateInputSchema = z.object({
    key: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_]*$/),
    displayName: z.string().trim().min(2).max(120),
    category: z.enum(["utility", "marketing", "authentication"]).default("utility"),
    language: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/).default("pt_BR"),
    bodyTemplate: z.string().trim().min(1).max(4000),
    variables: z.array(z.enum(["orderNumber", "stageLabel"])).max(20).default([]),
    variableNames: z.array(z.string().trim().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/)).max(50).default([]),
    flow: z.array(flowNodeSchema).max(100).default([]),
    components: metaComponentsSchema.optional(),
    metaTemplateName: z.string().trim().min(1).max(512).regex(/^[a-z0-9_]+$/).optional().nullable(),
    status: z.enum(["draft", "active", "archived"]).default("draft")
  }).strict();
  async function validateTemplateFlow(nodes: Array<z.infer<typeof flowNodeSchema>>, ownKey?: string) {
    const ids = new Set(nodes.map((node) => node.id));
    const branchIds = nodes.flatMap((node) => (node.branches ?? []).map((branch) => branch.id));
    if (nodes.filter((node) => node.trigger === "início").length > 1 || ids.size !== nodes.length || new Set(branchIds).size !== branchIds.length || nodes.some((node) =>
      (node.nextNodeId && !ids.has(node.nextNodeId)) || (node.branches ?? []).some((branch) => branch.nextNodeId && !ids.has(branch.nextNodeId))
    ) || nodes.some((node) => (node.branches ?? []).some((branch) => branch.trigger !== "qualquer resposta" && !branch.response.trim()))) throw new ApiError(400, "A árvore contém IDs repetidos, gatilho incompleto ou destino inexistente.", { code: "WHATSAPP_FLOW_INVALID" });
    const keys = new Set((await lilyPrisma.lilyWhatsAppMessageTemplate.findMany({ select: { key: true } })).map((item) => item.key));
    if (ownKey) keys.add(ownKey);
    if (nodes.some((node) => node.templateKey && !keys.has(node.templateKey))) throw new ApiError(400, "A árvore aponta para um template inexistente.", { code: "WHATSAPP_FLOW_TEMPLATE_NOT_FOUND" });
  }
  const simulatorPricingSchema = z.object({
    usdToBrl: z.number().min(0).max(1000),
    usd: z.object({ marketing: z.number().min(0).max(100), utility: z.number().min(0).max(100), authentication: z.number().min(0).max(100), service: z.number().min(0).max(100) }).strict(),
    freeServiceMessages: z.number().int().min(0).max(100_000_000), effectiveDate: z.string().date().optional(), source: z.string().max(500)
  }).strict();

  app.get("/api/v1/lily/admin/whatsapp/simulator", async (request) => {
    await requireLilyStaff(request);
    const settings = await lilyPrisma.lilyWhatsAppSimulatorSettings.findUnique({ where: { id: "default" } });
    const flows = await lilyPrisma.lilyWhatsAppMessageTemplate.findMany({ select: { key: true, flowJson: true } });
    return { pricing: settings ? JSON.parse(settings.pricingJson) : null, flows: Object.fromEntries(flows.map((item) => [item.key, JSON.parse(item.flowJson)])) };
  });

  app.put("/api/v1/lily/admin/whatsapp/simulator", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = z.object({ pricing: simulatorPricingSchema }).strict().parse(request.body);
    if (!Number.isFinite(input.pricing.usdToBrl) || Object.values(input.pricing.usd).some((rate) => !Number.isFinite(rate))) throw new ApiError(400, "Informe cotações numéricas válidas.", { code: "WHATSAPP_PRICING_INVALID" });
    const saved = await lilyPrisma.lilyWhatsAppSimulatorSettings.upsert({ where: { id: "default" }, create: { id: "default", pricingJson: JSON.stringify(input.pricing), updatedBy: context.user.id }, update: { pricingJson: JSON.stringify(input.pricing), updatedBy: context.user.id } });
    await auditLilyAdmin(context.user.id, "whatsapp.simulator.pricing.update", "whatsapp-simulator", "default", { fields: Object.keys(input.pricing) });
    return { pricing: JSON.parse(saved.pricingJson) };
  });

  app.put("/api/v1/lily/admin/whatsapp/templates/:key/flow", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { key } = z.object({ key: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_]*$/) }).parse(request.params);
    const nodes = z.array(flowNodeSchema).max(100).parse(request.body);
    await validateTemplateFlow(nodes, key);
    const updated = await lilyPrisma.lilyWhatsAppMessageTemplate.update({ where: { key }, data: { flowJson: JSON.stringify(nodes) } });
    await auditLilyAdmin(context.user.id, "whatsapp.template.flow.update", "whatsapp-template", updated.id, { nodeCount: nodes.length });
    return { key, nodes };
  });

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
        variableNames: JSON.parse(row.variableNamesJson),
        flow: JSON.parse(row.flowJson),
        components: JSON.parse(row.componentsJson),
        metaTemplateName: row.metaTemplateName,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }))
    };
  });

  app.post("/api/v1/lily/admin/whatsapp/templates/starter-pack", async (request) => {
    const context = await requireLilyAdmin(request, true);
    z.object({}).strict().parse(request.body ?? {});
    let created = 0;
    let existing = 0;
    const createdKeys: string[] = [];
    for (const preset of LILY_WHATSAPP_STARTER_TEMPLATES) {
      const current = await lilyPrisma.lilyWhatsAppMessageTemplate.findUnique({ where: { key: preset.key }, select: { id: true } });
      if (current) { existing += 1; continue; }
      await lilyPrisma.lilyWhatsAppMessageTemplate.create({
        data: {
          key: preset.key,
          displayName: preset.displayName,
          category: preset.category,
          language: "pt_BR",
          bodyTemplate: preset.bodyTemplate,
          variablesJson: JSON.stringify(preset.variables),
          variableNamesJson: JSON.stringify(preset.variableNames),
          flowJson: "[]",
          componentsJson: JSON.stringify(preset.components),
          status: "draft",
          createdBy: context.user.id
        }
      });
      created += 1;
      createdKeys.push(preset.key);
    }
    await auditLilyAdmin(context.user.id, "whatsapp.template.starter_pack.install", "whatsapp-template-pack", "customer-journey-v1", {
      created,
      existing,
      count: LILY_WHATSAPP_STARTER_TEMPLATES.length
    });
    return { created, existing, total: LILY_WHATSAPP_STARTER_TEMPLATES.length, createdKeys, templates: LILY_WHATSAPP_STARTER_TEMPLATES.map(({ key, displayName, category }) => ({ key, displayName, category, status: "draft" as const })) };
  });

  app.post("/api/v1/lily/admin/whatsapp/templates", async (request, reply) => {
    const context = await requireLilyAdmin(request, true);
    const input = templateInputSchema.parse(request.body);
    await validateTemplateFlow(input.flow, input.key);
    const components = input.components ?? [{ type: "BODY", text: input.bodyTemplate }];
    assertWhatsAppTemplateCanActivate(input.status, input.metaTemplateName, { key: input.key, category: input.category, components });
    const created = await lilyPrisma.lilyWhatsAppMessageTemplate.create({
      data: {
        key: input.key,
        displayName: input.displayName,
        category: input.category,
        language: input.language,
        bodyTemplate: input.bodyTemplate,
        variablesJson: JSON.stringify(input.variables),
        variableNamesJson: JSON.stringify(input.variableNames),
        flowJson: JSON.stringify(input.flow),
        componentsJson: JSON.stringify(components),
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
      variableNames: input.variableNames,
      flow: [],
      components,
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
    if (!current) throw new ApiError(404, "Template WhatsApp não encontrado.", { code: "WHATSAPP_TEMPLATE_NOT_FOUND" });
    if (input.flow) await validateTemplateFlow(input.flow, input.key ?? current.key);
    const nextMetaName = input.metaTemplateName === undefined ? current.metaTemplateName : input.metaTemplateName;
    const nextStatus = input.status ?? current.status;
    const nextKey = input.key ?? current.key;
    const nextCategory = input.category ?? current.category;
    const nextComponents = input.components ?? JSON.parse(current.componentsJson) as Array<{ type?: unknown }>;
    assertWhatsAppTemplateCanActivate(nextStatus, nextMetaName, { key: nextKey, category: nextCategory, components: nextComponents });
    const updated = await lilyPrisma.lilyWhatsAppMessageTemplate.update({
      where: { id },
      data: {
        ...(input.key !== undefined ? { key: input.key } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate } : {}),
        ...(input.variables !== undefined ? { variablesJson: JSON.stringify(input.variables) } : {}),
        ...(input.variableNames !== undefined ? { variableNamesJson: JSON.stringify(input.variableNames) } : {}),
        ...(input.flow !== undefined ? { flowJson: JSON.stringify(input.flow) } : {}),
        ...(input.components !== undefined ? { componentsJson: JSON.stringify(input.components) } : {}),
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
      variableNames: JSON.parse(updated.variableNamesJson),
      flow: JSON.parse(updated.flowJson),
      components: JSON.parse(updated.componentsJson),
      metaTemplateName: updated.metaTemplateName, status: updated.status, createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    } };
  });

}
