import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getLilyOperationalSettings } from "./fulfillment";
import { mercadoPagoConfiguration } from "./mercado-pago-provider";
import {
  requirePaymentChoiceHomologationIfRequested,
  requirePaymentChoiceOrderAccess,
  readPaymentChoiceIdempotencyKey,
  paymentChoiceIdSchema
} from "./payment-choice-access";
import { lilyPaymentChoiceAdminRoutes } from "./payment-choice-admin";
import {
  buildLilyPaymentMethodOptions,
  createLilyCardChoice,
  createLilyPixChoice,
  lilyPaymentMethodAvailability
} from "./payment-choice-routing";
import {
  lilyPaymentChoiceInclude,
  safeLilyPaymentEventJson,
  serializeLilyChoicePayment,
  stringifyLilyPaymentProviderData
} from "./payment-choice-serialization";
import { calculateLilyPaymentQuote, getLilyPaymentMethodSettings } from "./payment-method-rules";
import { enqueueLilyWhatsAppStage } from "./whatsapp";

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
  z.object({ orderId: paymentChoiceIdSchema, method: z.literal("pix"), payer: payerSchema.optional() }).strict(),
  z.object({ orderId: paymentChoiceIdSchema, method: z.literal("credit_card"), payer: payerSchema, card: cardSchema }).strict(),
  z.object({ orderId: paymentChoiceIdSchema, method: z.literal("debit_card"), payer: payerSchema, card: cardSchema }).strict()
]);

async function createProviderPayment(input: {
  paymentId: string;
  order: any;
  body: z.infer<typeof createChoicePaymentSchema>;
  quote: ReturnType<typeof calculateLilyPaymentQuote>;
  idempotencyKey: string;
  providers: Array<"cooklily_pix" | "mercado_pago" | "manual">;
}) {
  if (input.body.method === "pix") {
    return createLilyPixChoice({
      paymentId: input.paymentId,
      order: input.order,
      request: { ...(input.body.payer ? { payer: input.body.payer } : {}) },
      quote: input.quote,
      idempotencyKey: input.idempotencyKey,
      chain: input.providers
    });
  }
  return createLilyCardChoice({
    paymentId: input.paymentId,
    orderId: input.order.id,
    amountCents: input.quote.amountCents,
    method: input.body.method,
    idempotencyKey: input.idempotencyKey,
    payer: input.body.payer,
    card: input.body.card
  });
}

async function persistChoicePayment(input: {
  paymentId: string;
  order: any;
  context: any;
  body: z.infer<typeof createChoicePaymentSchema>;
  idempotencyKey: string;
  quote: ReturnType<typeof calculateLilyPaymentQuote>;
  availability: { providers: Array<"cooklily_pix" | "mercado_pago" | "manual"> };
  provider: "cooklily_pix" | "mercado_pago" | "manual";
  providerResult: any;
  attemptedProviders: Array<"cooklily_pix" | "mercado_pago" | "manual">;
}) {
  const exactApproval = input.providerResult.status === "approved"
    && input.providerResult.paidCents === input.quote.amountCents;
  const amountMismatch = input.providerResult.status === "approved" && !exactApproval;
  const storedStatus = amountMismatch ? "pending" : input.providerResult.status;
  const now = new Date();
  const providerDataJson = stringifyLilyPaymentProviderData({
    ...(input.providerResult.providerData ?? {}),
    orchestration: {
      version: 1,
      selectedMethod: input.body.method,
      baseAmountCents: input.quote.baseAmountCents,
      eligibleAmountCents: input.quote.eligibleAmountCents,
      deliveryFeeCents: input.quote.deliveryFeeCents,
      discountCents: input.quote.discountCents,
      amountCents: input.quote.amountCents,
      rule: input.quote.rule,
      fallbackChain: input.availability.providers,
      attemptedProviders: input.attemptedProviders,
      actualProvider: input.provider
    }
  });

  return lilyPrisma.$transaction(async (tx) => {
    const row = await tx.lilyPayment.create({
      data: {
        id: input.paymentId,
        orderId: input.order.id,
        idempotencyKey: input.idempotencyKey,
        provider: input.provider,
        method: input.body.method,
        status: storedStatus,
        amountCents: input.quote.amountCents,
        currency: "BRL",
        providerPaymentId: input.providerResult.providerPaymentId,
        providerReference: input.providerResult.providerReference,
        providerDataJson,
        instructionsSnapshot: input.providerResult.instructions,
        expiresAt: input.providerResult.expiresAt,
        ...(exactApproval ? { approvedAt: now } : {}),
        ...(storedStatus === "failed" ? { failedAt: now } : {})
      }
    });

    await tx.lilyPaymentEvent.create({
      data: {
        paymentId: row.id,
        source: input.context ? `customer:${input.context.user.id}` : "guest",
        eventType: "payment.created",
        fromStatus: null,
        toStatus: storedStatus,
        payloadJson: safeLilyPaymentEventJson({
          method: input.body.method,
          provider: input.provider,
          baseAmountCents: input.quote.baseAmountCents,
          discountCents: input.quote.discountCents,
          amountCents: input.quote.amountCents,
          fallbackChain: input.availability.providers
        })
      }
    });

    if (amountMismatch) {
      await tx.lilyPaymentEvent.create({
        data: {
          paymentId: row.id,
          source: `provider:${input.provider}`,
          eventType: "payment.amount_mismatch",
          fromStatus: "pending",
          toStatus: "pending",
          payloadJson: safeLilyPaymentEventJson({
            expectedCents: input.quote.amountCents,
            paidCents: input.providerResult.paidCents
          })
        }
      });
      await tx.lilyPaymentReconciliation.create({
        data: {
          paymentId: row.id,
          expectedGrossCents: input.quote.amountCents,
          reportedGrossCents: input.providerResult.paidCents ?? 0,
          feeCents: 0,
          netCents: input.providerResult.paidCents ?? 0,
          discrepancyCents: (input.providerResult.paidCents ?? 0) - input.quote.amountCents,
          status: "discrepant",
          providerReference: input.providerResult.providerReference,
          note: "Valor aprovado pelo processador diverge do valor após desconto por método.",
          reconciledBy: `provider:${input.provider}`
        }
      });
    } else if (exactApproval) {
      await tx.lilyPaymentEvent.create({
        data: {
          paymentId: row.id,
          source: `provider:${input.provider}`,
          eventType: "payment.approved",
          fromStatus: "pending",
          toStatus: "approved"
        }
      });
      await tx.lilyOrder.update({ where: { id: input.order.id }, data: { status: "paid", paidAt: now } });
      await tx.lilyOrderStatusEvent.create({
        data: {
          orderId: input.order.id,
          fromStatus: "awaiting_payment",
          toStatus: "paid",
          actor: `provider:${input.provider}`
        }
      });
      await enqueueLilyWhatsAppStage(tx, {
        orderId: input.order.id,
        optedIn: input.order.whatsappUpdatesOptIn,
        stage: "payment_confirmed",
        at: now
      });
    }
    return tx.lilyPayment.findUnique({ where: { id: row.id }, include: lilyPaymentChoiceInclude() });
  });
}

export async function lilyPaymentChoiceRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/payment-options/config", async (request) => {
    const homologation = await requirePaymentChoiceHomologationIfRequested(request);
    const settings = await getLilyOperationalSettings();
    const rules = await getLilyPaymentMethodSettings();
    return {
      enabled: settings.paymentsEnabled || homologation,
      homologation,
      publicKey: mercadoPagoConfiguration().publicKey,
      methods: await Promise.all(rules.map(async (rule) => {
        const availability = lilyPaymentMethodAvailability(settings, rule);
        const option = (await buildLilyPaymentMethodOptions({ grandTotalCents: 0, deliveryFeeCents: 0 }))
          .find((item) => item.id === rule.method)!;
        return { ...option, pricing: undefined, enabled: rule.enabled, available: availability.available };
      }))
    };
  });

  app.get("/api/v1/lily/orders/:orderId/payment-options", async (request) => {
    const { orderId } = z.object({ orderId: paymentChoiceIdSchema }).parse(request.params);
    const access = await requirePaymentChoiceOrderAccess(request, orderId, false);
    const homologation = await requirePaymentChoiceHomologationIfRequested(request);
    const settings = await getLilyOperationalSettings();
    const active = await lilyPrisma.lilyPayment.findFirst({
      where: { orderId, status: { in: ["pending", "approved", "partially_refunded"] } },
      include: lilyPaymentChoiceInclude(),
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
      methods: await buildLilyPaymentMethodOptions(access.order),
      activePayment: active ? serializeLilyChoicePayment(active) : null
    };
  });

  app.post("/api/v1/lily/payment-options", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const body = createChoicePaymentSchema.parse(request.body);
    const idempotencyKey = readPaymentChoiceIdempotencyKey(request);
    const access = await requirePaymentChoiceOrderAccess(request, body.orderId, true);
    const homologation = await requirePaymentChoiceHomologationIfRequested(request, true);
    const settings = await getLilyOperationalSettings();
    if (!settings.paymentsEnabled && !homologation) {
      throw new ApiError(503, "Pagamentos online ainda não estão habilitados.", { code: "LILY_PAYMENTS_DISABLED" });
    }
    if (homologation && !access.order.isHomologation) {
      throw new ApiError(409, "Modo de homologação exige pedido de homologação.", {
        code: "LILY_PAYMENT_HOMOLOGATION_ORDER_REQUIRED"
      });
    }

    const rule = (await getLilyPaymentMethodSettings()).find((row) => row.method === body.method)!;
    const availability = lilyPaymentMethodAvailability(settings, rule);
    if (!rule.enabled || !availability.available) {
      throw new ApiError(503, "Meio de pagamento indisponível no momento.", {
        code: "LILY_PAYMENT_METHOD_UNAVAILABLE",
        method: body.method
      });
    }
    const quote = calculateLilyPaymentQuote({
      method: body.method,
      grandTotalCents: access.order.grandTotalCents,
      deliveryFeeCents: access.order.deliveryFeeCents,
      setting: rule
    });

    const byKey = await lilyPrisma.lilyPayment.findUnique({ where: { idempotencyKey }, include: lilyPaymentChoiceInclude() });
    if (byKey) {
      if (byKey.orderId !== body.orderId || byKey.method !== body.method || byKey.amountCents !== quote.amountCents) {
        throw new ApiError(409, "Idempotency-Key já foi usado em outro pagamento.", { code: "LILY_PAYMENT_IDEMPOTENCY_CONFLICT" });
      }
      return reply.code(200).send(serializeLilyChoicePayment(byKey));
    }

    const active = await lilyPrisma.lilyPayment.findFirst({
      where: { orderId: body.orderId, status: { in: ["pending", "approved", "partially_refunded"] } },
      include: lilyPaymentChoiceInclude(),
      orderBy: { createdAt: "desc" }
    });
    if (active) {
      if (active.method !== body.method) {
        throw new ApiError(409, "Já existe um pagamento ativo para este pedido.", {
          code: "LILY_PAYMENT_ACTIVE_EXISTS",
          paymentId: active.id,
          paymentMethod: active.method
        });
      }
      return reply.code(200).send(serializeLilyChoicePayment(active));
    }
    if (access.order.status !== "awaiting_payment") {
      throw new ApiError(409, "Este pedido não aceita novo pagamento.", {
        code: "LILY_ORDER_PAYMENT_STATE",
        orderStatus: access.order.status
      });
    }

    const paymentId = crypto.randomUUID();
    const providerPayment = await createProviderPayment({
      paymentId,
      order: access.order,
      body,
      quote,
      idempotencyKey,
      providers: availability.providers
    });
    const created = await persistChoicePayment({
      paymentId,
      order: access.order,
      context: access.context,
      body,
      idempotencyKey,
      quote,
      availability,
      provider: providerPayment.provider,
      providerResult: providerPayment.result,
      attemptedProviders: [...providerPayment.attemptedProviders]
    });
    return reply.code(201).send(serializeLilyChoicePayment(created));
  });

  await lilyPaymentChoiceAdminRoutes(app);
}
