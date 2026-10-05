import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { getOptionalLilySession, requireLilyCsrf } from "./auth";
import { createCookLilyPixPayment, cookLilyPixConfiguration } from "./cooklily-pix-provider";
import { getLilyOperationalSettings } from "./fulfillment";
import { mercadoPagoConfiguration } from "./mercado-pago-provider";
import { createMercadoPagoChoicePayment } from "./mercado-pago-choice-provider";
import {
  calculateLilyPaymentQuote,
  getLilyPaymentMethodSettings,
  paymentMethodSettingsPatchSchema,
  saveLilyPaymentMethodSettings,
  type LilyCheckoutPaymentMethod,
  type LilyPaymentMethodSetting,
  type LilyPaymentQuote
} from "./payment-method-rules";
import { lilyPixAutoReconciliationConfiguration } from "./pix-reconciliation";
import { enqueueLilyWhatsAppStage } from "./whatsapp";

const idSchema = z.string().trim().min(1).max(120);
const payerSchema = z.object({
  email: z.string().trim().email().max(254),
  identification: z.object({
    type: z.string().trim().min(2).max(20),
    number: z.string().trim().regex(/^[0-9]{5,20}$/)
  }).strict().optional()
}).strict();
const cardSchema = z.object({
  token: z.string().trim().min(16).max(500),
  paymentMethodId: z.string().trim().min(2).max(80),
  installments: z.number().int().min(1).max(12)
}).strict();

const createChoicePaymentSchema = z.discriminatedUnion("method", [
  z.object({ orderId: idSchema, method: z.literal("pix"), payer: payerSchema.optional() }).strict(),
  z.object({ orderId: idSchema, method: z.literal("credit_card"), payer: payerSchema, card: cardSchema }).strict(),
  z.object({ orderId: idSchema, method: z.literal("debit_card"), payer: payerSchema, card: cardSchema }).strict()
]);

const adminChoiceSettingsSchema = z.object({
  paymentsEnabled: z.boolean().optional(),
  manualPixEnabled: z.boolean().optional(),
  manualPixInstructions: z.string().trim().max(2000).nullable().optional(),
  mercadoPagoPixEnabled: z.boolean().optional(),
  mercadoPagoCardEnabled: z.boolean().optional(),
  methods: paymentMethodSettingsPatchSchema.shape.methods.optional()
}).strict();

type PaymentProviderResult = {
  providerPaymentId: string | null;
  providerReference: string | null;
  status: "pending" | "approved" | "failed";
  paidCents: number | null;
  instructions: string | null;
  expiresAt: Date | null;
  providerData: Record<string, unknown> | null;
};

type ProviderId = "cooklily_pix" | "mercado_pago" | "manual";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeStringEqual(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readIdempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[A-Za-z0-9._:-]{16,120}$/.test(value)) {
    throw new ApiError(400, "Idempotency-Key de pagamento inválido ou ausente.", {
      code: "LILY_PAYMENT_IDEMPOTENCY_REQUIRED"
    });
  }
  return value;
}

async function requireOrderAccess(request: FastifyRequest, orderId: string, mutate: boolean) {
  const order = await lilyPrisma.lilyOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Pedido não encontrado.");
  const context = await getOptionalLilySession(request);

  if (order.userId) {
    if (!context || context.user.id !== order.userId) throw new ApiError(404, "Pedido não encontrado.");
    if (mutate) requireLilyCsrf(request, context);
    return { order, context };
  }

  const supplied = request.headers["x-lily-order-token"];
  if (typeof supplied !== "string" || !order.guestAccessTokenHash) {
    throw new ApiError(401, "Token do pedido necessário.", { code: "LILY_ORDER_TOKEN_REQUIRED" });
  }
  if (!timingSafeStringEqual(hashToken(supplied), order.guestAccessTokenHash)) {
    throw new ApiError(401, "Token do pedido inválido.", { code: "LILY_ORDER_TOKEN_INVALID" });
  }
  return { order, context: null };
}

function homologationRequested(request: FastifyRequest) {
  return request.headers["x-lily-homologation"] === "1";
}

async function requireHomologationIfRequested(request: FastifyRequest, mutate = false) {
  if (!homologationRequested(request)) return false;
  await requireLilyStaff(request, mutate);
  return true;
}

function pixProviders(settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>): ProviderId[] {
  const cookLily = cookLilyPixConfiguration();
  const mercadoPago = mercadoPagoConfiguration();
  const providers: ProviderId[] = [];
  if (cookLily.ready) providers.push("cooklily_pix");
  if (settings.mercadoPagoPixEnabled && mercadoPago.pixReady) providers.push("mercado_pago");
  if (settings.manualPixEnabled && settings.manualPixInstructions?.trim()) providers.push("manual");
  return providers;
}

function methodAvailability(
  settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>,
  rule: LilyPaymentMethodSetting
) {
  const mercadoPago = mercadoPagoConfiguration();
  if (!rule.enabled) return { available: false, providers: [] as ProviderId[] };
  if (rule.method === "pix") {
    const providers = pixProviders(settings);
    return { available: providers.length > 0, providers };
  }
  const available = settings.mercadoPagoCardEnabled && mercadoPago.cardReady;
  return { available, providers: available ? ["mercado_pago" as const] : [] };
}

function methodLabel(method: LilyCheckoutPaymentMethod) {
  return method === "pix" ? "Pix"
    : method === "credit_card" ? "Cartão de crédito"
    : "Cartão de débito";
}

function discountLabel(rule: LilyPaymentMethodSetting) {
  if (rule.discountType === "percentage" && rule.discountValue > 0) {
    const percentage = rule.discountValue / 100;
    return `${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de desconto`;
  }
  if (rule.discountType === "fixed" && rule.discountValue > 0) {
    return `R$ ${(rule.discountValue / 100).toFixed(2).replace(".", ",")} de desconto`;
  }
  return null;
}

function paymentInclude() {
  return { order: true, events: { orderBy: { createdAt: "asc" as const } } };
}

function parseStoredData(raw: string | null | undefined) {
  if (!raw) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function serializeChoicePayment(payment: any) {
  const providerData = parseStoredData(payment.providerDataJson);
  const orchestration = providerData.orchestration && typeof providerData.orchestration === "object"
    ? providerData.orchestration
    : null;
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber ?? null,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    instructions: payment.instructionsSnapshot,
    providerData: {
      ticketUrl: typeof providerData.ticketUrl === "string" ? providerData.ticketUrl : null,
      qrCode: typeof providerData.qrCode === "string" ? providerData.qrCode : null,
      qrCodeBase64: typeof providerData.qrCodeBase64 === "string" ? providerData.qrCodeBase64 : null,
      paymentMethodId: typeof providerData.paymentMethodId === "string" ? providerData.paymentMethodId : null,
      paymentMethodType: typeof providerData.paymentMethodType === "string" ? providerData.paymentMethodType : null,
      installments: typeof providerData.installments === "number" ? providerData.installments : null
    },
    pricing: orchestration ? {
      baseAmountCents: Number(orchestration.baseAmountCents ?? payment.amountCents),
      eligibleAmountCents: Number(orchestration.eligibleAmountCents ?? payment.amountCents),
      deliveryFeeCents: Number(orchestration.deliveryFeeCents ?? 0),
      discountCents: Number(orchestration.discountCents ?? 0),
      amountCents: payment.amountCents,
      rule: orchestration.rule ?? null
    } : {
      baseAmountCents: payment.amountCents,
      eligibleAmountCents: payment.amountCents,
      deliveryFeeCents: 0,
      discountCents: 0,
      amountCents: payment.amountCents,
      rule: null
    },
    routing: orchestration ? {
      fallbackChain: Array.isArray(orchestration.fallbackChain) ? orchestration.fallbackChain : [payment.provider],
      actualProvider: payment.provider
    } : { fallbackChain: [payment.provider], actualProvider: payment.provider },
    expiresAt: payment.expiresAt,
    approvedAt: payment.approvedAt,
    failedAt: payment.failedAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

async function buildMethodOptions(order: any) {
  const settings = await getLilyOperationalSettings();
  const rules = await getLilyPaymentMethodSettings();
  return rules.map((rule) => {
    const availability = methodAvailability(settings, rule);
    const quote = calculateLilyPaymentQuote({
      method: rule.method,
      grandTotalCents: order.grandTotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      setting: rule
    });
    return {
      id: rule.method,
      label: methodLabel(rule.method),
      available: availability.available,
      providers: availability.providers,
      preferredProvider: availability.providers[0] ?? null,
      requiresPayerEmail: rule.method !== "pix" || availability.providers[0] === "mercado_pago",
      fallbackMayUsePayerEmail: rule.method === "pix" && availability.providers.includes("mercado_pago"),
      discountLabel: discountLabel(rule),
      pricing: quote
    };
  });
}

async function createPix(
  input: z.infer<typeof createChoicePaymentSchema> & { method: "pix" },
  quote: LilyPaymentQuote,
  idempotencyKey: string,
  order: any,
  chain: ProviderId[]
): Promise<{ provider: ProviderId; result: PaymentProviderResult; attemptedProviders: ProviderId[] }> {
  const attemptedProviders: ProviderId[] = [];
  let lastLocalError: unknown = null;

  for (const provider of chain) {
    attemptedProviders.push(provider);
    if (provider === "cooklily_pix") {
      try {
        const result = await createCookLilyPixPayment({
          paymentId: crypto.randomUUID(),
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountCents: quote.amountCents,
          currency: "BRL",
          method: "pix",
          idempotencyKey,
          ...(input.payer ? { payer: input.payer } : {})
        });
        if (result.status !== "failed") {
          return { provider, result: result as PaymentProviderResult, attemptedProviders };
        }
        lastLocalError = new Error("Pix CookLily não pôde ser gerado.");
      } catch (error) {
        // O Pix próprio apenas gera BR Code localmente; falhar aqui não cria
        // transação bancária, então é seguro tentar o próximo provider.
        lastLocalError = error;
      }
      continue;
    }

    if (provider === "mercado_pago") {
      if (!input.payer?.email) {
        // Sem e-mail não iniciamos uma transação MP. Se existir fallback manual,
        // ele ainda pode ser usado com segurança.
        lastLocalError = new ApiError(400, "Informe um e-mail para usar o fallback Pix do Mercado Pago.", {
          code: "LILY_PIX_FALLBACK_EMAIL_REQUIRED"
        });
        continue;
      }
      const result = await createMercadoPagoChoicePayment({
        paymentId: crypto.randomUUID(),
        orderId: order.id,
        amountCents: quote.amountCents,
        method: "pix",
        idempotencyKey,
        payer: input.payer
      });
      // Depois de chamar o provedor externo não fazemos fallback silencioso em
      // caso de erro/timeout; a própria função falha fechado antes deste retorno.
      return { provider, result: result as PaymentProviderResult, attemptedProviders };
    }

    return {
      provider: "manual",
      result: {
        providerPaymentId: null,
        providerReference: null,
        status: "pending",
        paidCents: null,
        instructions: (await getLilyOperationalSettings()).manualPixInstructions?.trim() ?? null,
        expiresAt: null,
        providerData: null
      },
      attemptedProviders
    };
  }

  if (lastLocalError instanceof ApiError) throw lastLocalError;
  throw new ApiError(503, "Nenhuma rota Pix está disponível no momento.", {
    code: "LILY_PIX_ROUTE_UNAVAILABLE"
  });
}

function safeJson(value: unknown) {
  return JSON.stringify(value).slice(0, 8000);
}

export async function lilyPaymentChoiceRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/payment-options/config", async (request) => {
    const homologation = await requireHomologationIfRequested(request);
    const settings = await getLilyOperationalSettings();
    const rules = await getLilyPaymentMethodSettings();
    const mercadoPago = mercadoPagoConfiguration();
    const methods = rules.map((rule) => {
      const availability = methodAvailability(settings, rule);
      return {
        id: rule.method,
        label: methodLabel(rule.method),
        enabled: rule.enabled,
        available: availability.available,
        providers: availability.providers,
        preferredProvider: availability.providers[0] ?? null,
        discountLabel: discountLabel(rule)
      };
    });
    return {
      enabled: settings.paymentsEnabled || homologation,
      homologation,
      publicKey: mercadoPago.publicKey,
      methods
    };
  });

  app.get("/api/v1/lily/orders/:orderId/payment-options", async (request) => {
    const { orderId } = z.object({ orderId: idSchema }).parse(request.params);
    const access = await requireOrderAccess(request, orderId, false);
    const homologation = await requireHomologationIfRequested(request);
    const settings = await getLilyOperationalSettings();
    const methods = await buildMethodOptions(access.order);
    const active = await lilyPrisma.lilyPayment.findFirst({
      where: { orderId, status: { in: ["pending", "approved", "partially_refunded"] } },
      include: paymentInclude(),
      orderBy: { createdAt: "desc" }
    });
    return {
      enabled: settings.paymentsEnabled || homologation,
      homologation,
      order: {
        id: access.order.id,
        orderNumber: access.order.orderNumber,
        status: access.order.status,
        baseAmountCents: access.order.grandTotalCents,
        deliveryFeeCents: access.order.deliveryFeeCents,
        currency: "BRL"
      },
      publicKey: mercadoPagoConfiguration().publicKey,
      methods,
      activePayment: active ? serializeChoicePayment(active) : null
    };
  });

  app.post("/api/v1/lily/payment-options", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = createChoicePaymentSchema.parse(request.body);
    const idempotencyKey = readIdempotencyKey(request);
    const access = await requireOrderAccess(request, input.orderId, true);
    const homologation = await requireHomologationIfRequested(request, true);
    const settings = await getLilyOperationalSettings();
    if (!settings.paymentsEnabled && !homologation) {
      throw new ApiError(503, "Pagamentos online ainda não estão habilitados.", { code: "LILY_PAYMENTS_DISABLED" });
    }
    if (homologation && !access.order.isHomologation) {
      throw new ApiError(409, "Modo de homologação exige pedido de homologação.", {
        code: "LILY_PAYMENT_HOMOLOGATION_ORDER_REQUIRED"
      });
    }

    const rules = await getLilyPaymentMethodSettings();
    const rule = rules.find((row) => row.method === input.method)!;
    const availability = methodAvailability(settings, rule);
    if (!rule.enabled || !availability.available) {
      throw new ApiError(503, "Meio de pagamento indisponível no momento.", {
        code: "LILY_PAYMENT_METHOD_UNAVAILABLE",
        method: input.method
      });
    }

    const quote = calculateLilyPaymentQuote({
      method: input.method,
      grandTotalCents: access.order.grandTotalCents,
      deliveryFeeCents: access.order.deliveryFeeCents,
      setting: rule
    });

    const byKey = await lilyPrisma.lilyPayment.findUnique({
      where: { idempotencyKey },
      include: paymentInclude()
    });
    if (byKey) {
      if (byKey.orderId !== input.orderId || byKey.method !== input.method || byKey.amountCents !== quote.amountCents) {
        throw new ApiError(409, "Idempotency-Key já foi usado em outro pagamento.", {
          code: "LILY_PAYMENT_IDEMPOTENCY_CONFLICT"
        });
      }
      return reply.code(200).send(serializeChoicePayment(byKey));
    }

    const active = await lilyPrisma.lilyPayment.findFirst({
      where: {
        orderId: input.orderId,
        status: { in: ["pending", "approved", "partially_refunded"] }
      },
      include: paymentInclude(),
      orderBy: { createdAt: "desc" }
    });
    if (active) {
      if (active.method !== input.method) {
        throw new ApiError(409, "Já existe um pagamento ativo para este pedido.", {
          code: "LILY_PAYMENT_ACTIVE_EXISTS",
          paymentId: active.id,
          paymentMethod: active.method
        });
      }
      return reply.code(200).send(serializeChoicePayment(active));
    }

    if (access.order.status !== "awaiting_payment") {
      throw new ApiError(409, "Este pedido não aceita novo pagamento.", {
        code: "LILY_ORDER_PAYMENT_STATE",
        orderStatus: access.order.status
      });
    }

    const paymentId = crypto.randomUUID();
    let provider: ProviderId;
    let providerResult: PaymentProviderResult;
    let attemptedProviders: ProviderId[];

    if (input.method === "pix") {
      const created = await createPix(input, quote, idempotencyKey, access.order, availability.providers);
      provider = created.provider;
      providerResult = created.result;
      attemptedProviders = created.attemptedProviders;
    } else {
      const created = await createMercadoPagoChoicePayment({
        paymentId,
        orderId: access.order.id,
        amountCents: quote.amountCents,
        method: input.method,
        idempotencyKey,
        payer: input.payer,
        card: {
          ...input.card,
          installments: input.method === "debit_card" ? 1 : input.card.installments
        }
      });
      provider = "mercado_pago";
      providerResult = created as PaymentProviderResult;
      attemptedProviders = ["mercado_pago"];
    }

    const exactApproval = providerResult.status === "approved" && providerResult.paidCents === quote.amountCents;
    const amountMismatch = providerResult.status === "approved" && !exactApproval;
    const storedStatus = amountMismatch ? "pending" : providerResult.status;
    const now = new Date();
    const providerDataJson = {
      ...(providerResult.providerData ?? {}),
      orchestration: {
        version: 1,
        selectedMethod: input.method,
        baseAmountCents: quote.baseAmountCents,
        eligibleAmountCents: quote.eligibleAmountCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        discountCents: quote.discountCents,
        amountCents: quote.amountCents,
        rule: quote.rule,
        fallbackChain: availability.providers,
        attemptedProviders,
        actualProvider: provider
      }
    };

    const created = await lilyPrisma.$transaction(async (tx) => {
      const row = await tx.lilyPayment.create({
        data: {
          id: paymentId,
          orderId: access.order.id,
          idempotencyKey,
          provider,
          method: input.method,
          status: storedStatus,
          amountCents: quote.amountCents,
          currency: "BRL",
          providerPaymentId: providerResult.providerPaymentId,
          providerReference: providerResult.providerReference,
          providerDataJson: safeJson(providerDataJson),
          instructionsSnapshot: providerResult.instructions,
          expiresAt: providerResult.expiresAt,
          ...(exactApproval ? { approvedAt: now } : {}),
          ...(storedStatus === "failed" ? { failedAt: now } : {})
        }
      });

      await tx.lilyPaymentEvent.create({
        data: {
          paymentId: row.id,
          source: access.context ? `customer:${access.context.user.id}` : "guest",
          eventType: "payment.created",
          fromStatus: null,
          toStatus: storedStatus,
          payloadJson: safeJson({
            method: input.method,
            provider,
            baseAmountCents: quote.baseAmountCents,
            discountCents: quote.discountCents,
            amountCents: quote.amountCents,
            fallbackChain: availability.providers
          })
        }
      });

      if (amountMismatch) {
        await tx.lilyPaymentEvent.create({
          data: {
            paymentId: row.id,
            source: `provider:${provider}`,
            eventType: "payment.amount_mismatch",
            fromStatus: "pending",
            toStatus: "pending",
            payloadJson: safeJson({ expectedCents: quote.amountCents, paidCents: providerResult.paidCents })
          }
        });
        await tx.lilyPaymentReconciliation.create({
          data: {
            paymentId: row.id,
            expectedGrossCents: quote.amountCents,
            reportedGrossCents: providerResult.paidCents ?? 0,
            feeCents: 0,
            netCents: providerResult.paidCents ?? 0,
            discrepancyCents: (providerResult.paidCents ?? 0) - quote.amountCents,
            status: "discrepant",
            providerReference: providerResult.providerReference,
            note: "Valor aprovado pelo processador diverge do valor após desconto por método.",
            reconciledBy: `provider:${provider}`
          }
        });
      } else if (exactApproval) {
        await tx.lilyPaymentEvent.create({
          data: {
            paymentId: row.id,
            source: `provider:${provider}`,
            eventType: "payment.approved",
            fromStatus: "pending",
            toStatus: "approved"
          }
        });
        await tx.lilyOrder.update({
          where: { id: access.order.id },
          data: { status: "paid", paidAt: now }
        });
        await tx.lilyOrderStatusEvent.create({
          data: {
            orderId: access.order.id,
            fromStatus: "awaiting_payment",
            toStatus: "paid",
            actor: `provider:${provider}`
          }
        });
        await enqueueLilyWhatsAppStage(tx, {
          orderId: access.order.id,
          optedIn: access.order.whatsappUpdatesOptIn,
          stage: "payment_confirmed",
          at: now
        });
      }
      return tx.lilyPayment.findUnique({ where: { id: row.id }, include: paymentInclude() });
    });

    return reply.code(201).send(serializeChoicePayment(created));
  });

  app.get("/api/v1/lily/admin/payment-options/settings", async (request) => {
    await requireLilyStaff(request);
    const settings = await getLilyOperationalSettings();
    const methods = await getLilyPaymentMethodSettings();
    const mercadoPago = mercadoPagoConfiguration();
    const cookLily = cookLilyPixConfiguration();
    const reconciliation = lilyPixAutoReconciliationConfiguration();
    return {
      paymentsEnabled: settings.paymentsEnabled,
      manualPixEnabled: settings.manualPixEnabled,
      manualPixInstructions: settings.manualPixInstructions,
      mercadoPagoPixEnabled: settings.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: settings.mercadoPagoCardEnabled,
      methods,
      readiness: {
        cookLilyPix: { ...cookLily, reconciliationReady: reconciliation.ready },
        mercadoPago: {
          accessTokenConfigured: mercadoPago.accessTokenConfigured,
          publicKeyConfigured: Boolean(mercadoPago.publicKey),
          webhookSecretConfigured: mercadoPago.webhookSecretConfigured,
          pixReady: mercadoPago.pixReady,
          cardReady: mercadoPago.cardReady
        },
        pixFallbackChain: pixProviders(settings)
      }
    };
  });

  app.patch("/api/v1/lily/admin/payment-options/settings", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = adminChoiceSettingsSchema.parse(request.body);
    const current = await getLilyOperationalSettings();
    const currentMethods = await getLilyPaymentMethodSettings();
    const nextMethods = input.methods ?? currentMethods;

    const next = {
      paymentsEnabled: input.paymentsEnabled ?? current.paymentsEnabled,
      manualPixEnabled: input.manualPixEnabled ?? current.manualPixEnabled,
      manualPixInstructions: input.manualPixInstructions === undefined
        ? current.manualPixInstructions
        : input.manualPixInstructions,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled ?? current.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled ?? current.mercadoPagoCardEnabled
    };

    if (next.manualPixEnabled && !next.manualPixInstructions?.trim()) {
      throw new ApiError(400, "Informe as instruções antes de habilitar o fallback Pix manual.", {
        code: "LILY_MANUAL_PIX_INSTRUCTIONS_REQUIRED"
      });
    }

    const mockSettings = { ...current, ...next };
    const availableCount = nextMethods.filter((rule) => methodAvailability(mockSettings, rule).available).length;
    if (next.paymentsEnabled && availableCount === 0) {
      throw new ApiError(400, "Nenhum método habilitado possui provider pronto para uso.", {
        code: "LILY_PAYMENT_CONFIGURATION_REQUIRED"
      });
    }

    const updatedOperational = await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        paymentsEnabled: next.paymentsEnabled,
        manualPixEnabled: next.manualPixEnabled,
        manualPixInstructions: next.manualPixInstructions?.trim() || null,
        mercadoPagoPixEnabled: next.mercadoPagoPixEnabled,
        mercadoPagoCardEnabled: next.mercadoPagoCardEnabled
      }
    });
    const updatedMethods = input.methods ? await saveLilyPaymentMethodSettings(input.methods) : currentMethods;

    await auditLilyAdmin(context.user.id, "update", "payment-method-settings", "default", {
      paymentsEnabled: input.paymentsEnabled,
      manualPixEnabled: input.manualPixEnabled,
      manualPixInstructionsChanged: input.manualPixInstructions !== undefined,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled,
      methods: input.methods?.map((row) => ({
        method: row.method,
        enabled: row.enabled,
        discountType: row.discountType,
        discountValue: row.discountValue,
        maxDiscountCents: row.maxDiscountCents,
        minimumOrderCents: row.minimumOrderCents
      }))
    });

    return {
      paymentsEnabled: updatedOperational.paymentsEnabled,
      manualPixEnabled: updatedOperational.manualPixEnabled,
      manualPixInstructions: updatedOperational.manualPixInstructions,
      mercadoPagoPixEnabled: updatedOperational.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: updatedOperational.mercadoPagoCardEnabled,
      methods: updatedMethods,
      readiness: {
        cookLilyPix: cookLilyPixConfiguration(),
        mercadoPago: mercadoPagoConfiguration(),
        pixFallbackChain: pixProviders(updatedOperational)
      }
    };
  });
}
