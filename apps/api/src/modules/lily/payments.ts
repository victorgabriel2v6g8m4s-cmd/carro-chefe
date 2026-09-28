import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { getOptionalLilySession, requireLilyCsrf } from "./auth";
import { getLilyOperationalSettings } from "./fulfillment";
import {
  lilyPaymentProvider,
  type LilyPaymentProviderRemoteState
} from "./payment-provider";
import {
  mercadoPagoConfiguration,
  verifyMercadoPagoWebhookSignature
} from "./mercado-pago-provider";
import { cookLilyPixConfiguration } from "./cooklily-pix-provider";

const idSchema = z.string().trim().min(1).max(120);
const moneySchema = z.number().int().min(0).max(10_000_000);
const payerSchema = z.object({
  email: z.string().trim().email().max(254),
  identification: z.object({
    type: z.string().trim().min(2).max(20),
    number: z.string().trim().regex(/^[0-9]{5,20}$/)
  }).strict().optional()
}).strict();

const createPaymentSchema = z.discriminatedUnion("method", [
  z.object({
    orderId: idSchema,
    method: z.literal("manual_pix")
  }).strict(),
  z.object({
    orderId: idSchema,
    method: z.literal("pix"),
    payer: payerSchema.optional()
  }).strict(),
  z.object({
    orderId: idSchema,
    method: z.literal("credit_card"),
    payer: payerSchema,
    card: z.object({
      token: z.string().trim().min(16).max(500),
      paymentMethodId: z.string().trim().min(2).max(80),
      installments: z.number().int().min(1).max(12)
    }).strict()
  }).strict()
]);

const paymentSettingsSchema = z.object({
  paymentsEnabled: z.boolean().optional(),
  paymentProvider: z.enum(["manual", "cooklily_pix", "mercado_pago"]).optional(),
  manualPixEnabled: z.boolean().optional(),
  manualPixInstructions: z.string().trim().max(2000).nullable().optional(),
  mercadoPagoPixEnabled: z.boolean().optional(),
  mercadoPagoCardEnabled: z.boolean().optional()
}).strict();

const confirmationSchema = z.object({
  providerReference: z.string().trim().min(2).max(160),
  reportedGrossCents: moneySchema.optional(),
  feeCents: moneySchema.default(0),
  netCents: moneySchema.optional(),
  note: z.string().trim().max(500).nullable().optional()
}).strict();

const reconciliationSchema = z.object({
  reportedGrossCents: moneySchema,
  feeCents: moneySchema.default(0),
  netCents: moneySchema,
  providerReference: z.string().trim().max(160).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional()
}).strict();

const refundSchema = z.object({
  amountCents: z.number().int().min(1).max(10_000_000),
  providerReference: z.string().trim().min(2).max(160).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional()
}).strict();

const paymentInclude = {
  order: true,
  events: { orderBy: { createdAt: "asc" as const } },
  reconciliations: { orderBy: { createdAt: "desc" as const } }
};

function homologationRequested(request: FastifyRequest) {
  return request.headers["x-lily-homologation"] === "1";
}

async function requirePaymentHomologation(request: FastifyRequest, requireCsrf = false) {
  if (!homologationRequested(request)) return false;
  await requireLilyStaff(request, requireCsrf);
  return true;
}

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

async function requireOrderPaymentAccess(request: FastifyRequest, orderId: string, mutate: boolean) {
  const order = await lilyPrisma.lilyOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Pedido não encontrado.");

  const context = await getOptionalLilySession(request);
  if (order.userId) {
    if (!context || context.user.id !== order.userId) {
      throw new ApiError(404, "Pedido não encontrado.");
    }
    if (mutate) requireLilyCsrf(request, context);
    return { order, context };
  }

  const supplied = request.headers["x-lily-order-token"];
  if (typeof supplied !== "string" || !order.guestAccessTokenHash) {
    throw new ApiError(401, "Token do pedido necessário.", { code: "LILY_ORDER_TOKEN_REQUIRED" });
  }
  const actual = hashToken(supplied);
  if (!timingSafeStringEqual(actual, order.guestAccessTokenHash)) {
    throw new ApiError(401, "Token do pedido inválido.", { code: "LILY_ORDER_TOKEN_INVALID" });
  }
  return { order, context: null };
}

function parseProviderData(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ticketUrl: typeof parsed.ticketUrl === "string" ? parsed.ticketUrl : null,
      qrCode: typeof parsed.qrCode === "string" ? parsed.qrCode : null,
      qrCodeBase64: typeof parsed.qrCodeBase64 === "string" ? parsed.qrCodeBase64 : null,
      paymentMethodId: typeof parsed.paymentMethodId === "string" ? parsed.paymentMethodId : null,
      paymentMethodType: typeof parsed.paymentMethodType === "string" ? parsed.paymentMethodType : null,
      installments: typeof parsed.installments === "number" ? parsed.installments : null
    };
  } catch {
    return null;
  }
}

function serializePayment(payment: any, internal = false) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber ?? null,
    isHomologation: Boolean(payment.order?.isHomologation),
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    instructions: payment.instructionsSnapshot,
    providerData: parseProviderData(payment.providerDataJson),
    expiresAt: payment.expiresAt,
    approvedAt: payment.approvedAt,
    failedAt: payment.failedAt,
    cancelledAt: payment.cancelledAt,
    refundedAt: payment.refundedAt,
    refundedCents: payment.refundedCents,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    events: (payment.events ?? []).map((event: any) => ({
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      createdAt: event.createdAt,
      ...(internal ? { source: event.source } : {})
    })),
    reconciliations: (payment.reconciliations ?? []).map((row: any) => ({
      status: row.status,
      createdAt: row.createdAt,
      ...(internal ? {
        expectedGrossCents: row.expectedGrossCents,
        reportedGrossCents: row.reportedGrossCents,
        feeCents: row.feeCents,
        netCents: row.netCents,
        discrepancyCents: row.discrepancyCents,
        providerReference: row.providerReference,
        note: row.note
      } : {})
    })),
    ...(internal ? { providerReference: payment.providerReference } : {})
  };
}

function safeEventPayload(value: unknown) {
  return JSON.stringify(value).slice(0, 4000);
}

function reconciliationValues(paymentAmount: number, input: z.infer<typeof reconciliationSchema>) {
  const accountingMatches = input.netCents + input.feeCents === input.reportedGrossCents;
  const discrepancyCents = input.reportedGrossCents - paymentAmount;
  return {
    expectedGrossCents: paymentAmount,
    reportedGrossCents: input.reportedGrossCents,
    feeCents: input.feeCents,
    netCents: input.netCents,
    discrepancyCents,
    status: discrepancyCents === 0 && accountingMatches ? "matched" : "discrepant"
  };
}

function providerStatusEvent(status: LilyPaymentProviderRemoteState["status"]) {
  return status === "approved" ? "payment.approved"
    : status === "refunded" ? "payment.refunded"
    : status === "partially_refunded" ? "payment.partially_refunded"
    : status === "cancelled" ? "payment.cancelled"
    : status === "failed" ? "payment.failed"
    : "payment.provider_sync";
}

async function applyRemotePaymentState(
  payment: any,
  remote: LilyPaymentProviderRemoteState,
  source: string,
  providerEventId?: string
) {
  if (providerEventId) {
    const duplicate = await lilyPrisma.lilyPaymentEvent.findUnique({ where: { providerEventId } });
    if (duplicate) {
      return lilyPrisma.lilyPayment.findUnique({ where: { id: payment.id }, include: paymentInclude });
    }
  }

  const now = new Date();
  const amountMismatch = remote.status === "approved"
    && remote.paidCents !== null
    && remote.paidCents !== payment.amountCents;

  return lilyPrisma.$transaction(async (tx) => {
    const current = await tx.lilyPayment.findUnique({ where: { id: payment.id }, include: { order: true } });
    if (!current) throw new ApiError(404, "Pagamento não encontrado.");

    if (amountMismatch) {
      await tx.lilyPayment.update({
        where: { id: current.id },
        data: {
          providerPaymentId: remote.providerPaymentId ?? current.providerPaymentId,
          providerReference: remote.providerReference ?? current.providerReference,
          providerDataJson: JSON.stringify(remote.data)
        }
      });
      await tx.lilyPaymentEvent.create({
        data: {
          paymentId: current.id,
          source,
          eventType: "payment.amount_mismatch",
          providerEventId: providerEventId ?? null,
          fromStatus: current.status,
          toStatus: current.status,
          payloadJson: safeEventPayload({
            expectedCents: current.amountCents,
            paidCents: remote.paidCents,
            providerStatus: remote.providerStatus,
            providerStatusDetail: remote.providerStatusDetail
          })
        }
      });
      await tx.lilyPaymentReconciliation.create({
        data: {
          paymentId: current.id,
          expectedGrossCents: current.amountCents,
          reportedGrossCents: remote.paidCents ?? 0,
          feeCents: 0,
          netCents: remote.paidCents ?? 0,
          discrepancyCents: (remote.paidCents ?? 0) - current.amountCents,
          status: "discrepant",
          providerReference: remote.providerReference,
          note: "Valor informado pelo processador diverge do valor do pedido.",
          reconciledBy: source
        }
      });
      return tx.lilyPayment.findUnique({ where: { id: current.id }, include: paymentInclude });
    }

    const nextStatus = remote.status;
    const statusChanged = nextStatus !== current.status;
    const refundedCents = Math.max(current.refundedCents, remote.refundedCents);
    await tx.lilyPayment.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        providerPaymentId: remote.providerPaymentId ?? current.providerPaymentId,
        providerReference: remote.providerReference ?? current.providerReference,
        providerDataJson: JSON.stringify(remote.data),
        refundedCents,
        ...(nextStatus === "approved" && !current.approvedAt ? { approvedAt: now } : {}),
        ...(nextStatus === "failed" && !current.failedAt ? { failedAt: now } : {}),
        ...(nextStatus === "cancelled" && !current.cancelledAt ? { cancelledAt: now } : {}),
        ...(nextStatus === "refunded" && !current.refundedAt ? { refundedAt: now } : {})
      }
    });

    await tx.lilyPaymentEvent.create({
      data: {
        paymentId: current.id,
        source,
        eventType: statusChanged ? providerStatusEvent(nextStatus) : "payment.provider_sync",
        providerEventId: providerEventId ?? null,
        fromStatus: current.status,
        toStatus: nextStatus,
        payloadJson: safeEventPayload({
          providerStatus: remote.providerStatus,
          providerStatusDetail: remote.providerStatusDetail,
          paidCents: remote.paidCents,
          refundedCents: remote.refundedCents
        })
      }
    });

    if ((nextStatus === "approved" || nextStatus === "partially_refunded")
      && current.order.status === "awaiting_payment") {
      await tx.lilyOrder.update({
        where: { id: current.orderId },
        data: { status: "paid", paidAt: current.order.paidAt ?? now }
      });
      await tx.lilyOrderStatusEvent.create({
        data: {
          orderId: current.orderId,
          fromStatus: "awaiting_payment",
          toStatus: "paid",
          actor: source
        }
      });
    } else if (nextStatus === "refunded" && ["awaiting_payment", "paid"].includes(current.order.status)) {
      await tx.lilyOrder.update({
        where: { id: current.orderId },
        data: { status: "refunded" }
      });
      await tx.lilyOrderStatusEvent.create({
        data: {
          orderId: current.orderId,
          fromStatus: current.order.status,
          toStatus: "refunded",
          actor: source
        }
      });
    }

    return tx.lilyPayment.findUnique({ where: { id: current.id }, include: paymentInclude });
  });
}

function paymentMethods(
  settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>,
  options: { allowDisabled?: boolean } = {}
) {
  if (!settings.paymentsEnabled && !options.allowDisabled) return [];

  if (settings.paymentProvider === "manual") {
    return settings.manualPixEnabled && settings.manualPixInstructions?.trim()
      ? [{ id: "manual_pix" as const, label: "Pix", confirmation: "manual" as const }]
      : [];
  }

  if (settings.paymentProvider === "cooklily_pix") {
    const configured = cookLilyPixConfiguration();
    return configured.ready
      ? [{ id: "pix" as const, label: "Pix CookLily", confirmation: "manual" as const }]
      : [];
  }

  if (settings.paymentProvider === "mercado_pago") {
    const configured = mercadoPagoConfiguration();
    return [
      ...(settings.mercadoPagoPixEnabled && configured.pixReady
        ? [{ id: "pix" as const, label: "Pix", confirmation: "automatic" as const }]
        : []),
      ...(settings.mercadoPagoCardEnabled && configured.cardReady
        ? [{ id: "credit_card" as const, label: "Cartão de crédito", confirmation: "automatic" as const }]
        : [])
    ];
  }

  return [];
}

export async function lilyPaymentRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/payments/config", async (request) => {
    const isHomologation = await requirePaymentHomologation(request);
    const settings = await getLilyOperationalSettings();
    const mercadoPago = mercadoPagoConfiguration();
    const cookLilyPix = cookLilyPixConfiguration();
    const cookLilyPix = cookLilyPixConfiguration();
    const methods = paymentMethods(settings, { allowDisabled: isHomologation });
    return {
      enabled: settings.paymentsEnabled || isHomologation,
      homologation: isHomologation,
      provider: settings.paymentProvider,
      providerConfigured: methods.length > 0,
      publicKey: settings.paymentProvider === "mercado_pago" ? mercadoPago.publicKey : null,
      cookLilyPixConfigured: cookLilyPix.ready,
      methods
    };
  });

  app.get("/api/v1/lily/orders/:orderId/payment-context", async (request) => {
    const { orderId } = z.object({ orderId: idSchema }).parse(request.params);
    const access = await requireOrderPaymentAccess(request, orderId, false);
    return {
      id: access.order.id,
      orderNumber: access.order.orderNumber,
      status: access.order.status,
      isHomologation: access.order.isHomologation,
      amountCents: access.order.grandTotalCents,
      currency: "BRL"
    };
  });

  app.post("/api/v1/lily/payments", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = createPaymentSchema.parse(request.body);
    const idempotencyKey = readIdempotencyKey(request);
    const access = await requireOrderPaymentAccess(request, input.orderId, true);
    const isHomologation = await requirePaymentHomologation(request, true);
    if (isHomologation && !access.order.isHomologation) {
      throw new ApiError(409, "Modo de homologação exige um pedido de homologação.", {
        code: "LILY_PAYMENT_HOMOLOGATION_ORDER_REQUIRED"
      });
    }
    const settings = await getLilyOperationalSettings();
    const mercadoPago = mercadoPagoConfiguration();

    if (!settings.paymentsEnabled && !isHomologation) {
      throw new ApiError(503, "Pagamentos online ainda não estão habilitados.", { code: "LILY_PAYMENTS_DISABLED" });
    }

    if (settings.paymentProvider === "manual") {
      if (input.method !== "manual_pix" || !settings.manualPixEnabled || !settings.manualPixInstructions?.trim()) {
        throw new ApiError(503, "Pix manual ainda não está configurado.", { code: "LILY_PIX_DISABLED" });
      }
    } else if (settings.paymentProvider === "cooklily_pix") {
      if (input.method !== "pix") {
        throw new ApiError(400, "O Pix próprio CookLily aceita apenas Pix.", {
          code: "LILY_PAYMENT_METHOD_UNSUPPORTED"
        });
      }
      if (!cookLilyPix.ready) {
        throw new ApiError(503, "Pix próprio CookLily ainda não está configurado.", {
          code: "LILY_COOKLILY_PIX_NOT_CONFIGURED"
        });
      }
    } else if (settings.paymentProvider === "mercado_pago") {
      if (input.method === "manual_pix") {
        throw new ApiError(400, "Meio de pagamento incompatível com o processador selecionado.", {
          code: "LILY_PAYMENT_METHOD_UNSUPPORTED"
        });
      }
      if (input.method === "pix" && (!settings.mercadoPagoPixEnabled || !mercadoPago.pixReady)) {
        throw new ApiError(503, "Pix automático ainda não está configurado.", { code: "LILY_PIX_DISABLED" });
      }
      if (input.method === "credit_card" && (!settings.mercadoPagoCardEnabled || !mercadoPago.cardReady)) {
        throw new ApiError(503, "Cartão ainda não está configurado.", { code: "LILY_CARD_DISABLED" });
      }
    } else {
      throw new ApiError(503, "Processador de pagamento não suportado.", {
        code: "LILY_PAYMENT_PROVIDER_UNSUPPORTED"
      });
    }

    if (!["awaiting_payment", "paid"].includes(access.order.status)) {
      throw new ApiError(409, "Este pedido não aceita novo pagamento.", {
        code: "LILY_ORDER_PAYMENT_STATE",
        orderStatus: access.order.status
      });
    }

    const byKey = await lilyPrisma.lilyPayment.findUnique({
      where: { idempotencyKey },
      include: paymentInclude
    });
    if (byKey) {
      if (byKey.orderId !== input.orderId || byKey.method !== input.method || byKey.amountCents !== access.order.grandTotalCents) {
        throw new ApiError(409, "Idempotency-Key já foi usado em outro pagamento.", {
          code: "LILY_PAYMENT_IDEMPOTENCY_CONFLICT"
        });
      }
      return reply.code(200).send(serializePayment(byKey));
    }

    const active = await lilyPrisma.lilyPayment.findFirst({
      where: {
        orderId: input.orderId,
        status: { in: ["pending", "approved", "partially_refunded"] }
      },
      include: paymentInclude,
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
      return reply.code(200).send(serializePayment(active));
    }

    const paymentId = crypto.randomUUID();
    const provider = lilyPaymentProvider(settings.paymentProvider);
    const providerResult = await provider.createPayment({
      paymentId,
      orderId: access.order.id,
      orderNumber: access.order.orderNumber,
      amountCents: access.order.grandTotalCents,
      currency: "BRL",
      method: input.method,
      idempotencyKey,
      instructions: input.method === "manual_pix" ? settings.manualPixInstructions?.trim() : null,
      ...("payer" in input ? { payer: input.payer } : {}),
      ...("card" in input ? { card: input.card } : {})
    });

    const exactApproval = providerResult.status === "approved"
      && providerResult.paidCents === access.order.grandTotalCents;
    const amountMismatch = providerResult.status === "approved" && !exactApproval;
    const storedStatus = amountMismatch ? "pending" : providerResult.status;
    const now = new Date();

    const created = await lilyPrisma.$transaction(async (tx) => {
      const row = await tx.lilyPayment.create({
        data: {
          id: paymentId,
          orderId: access.order.id,
          idempotencyKey,
          provider: provider.id,
          method: input.method,
          status: storedStatus,
          amountCents: access.order.grandTotalCents,
          currency: "BRL",
          providerPaymentId: providerResult.providerPaymentId,
          providerReference: providerResult.providerReference,
          providerDataJson: providerResult.providerData ? JSON.stringify(providerResult.providerData) : null,
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
          payloadHash: crypto.createHash("sha256").update(idempotencyKey).digest("hex")
        }
      });

      if (amountMismatch) {
        await tx.lilyPaymentEvent.create({
          data: {
            paymentId: row.id,
            source: `provider:${provider.id}`,
            eventType: "payment.amount_mismatch",
            fromStatus: "pending",
            toStatus: "pending",
            payloadJson: safeEventPayload({
              expectedCents: access.order.grandTotalCents,
              paidCents: providerResult.paidCents
            })
          }
        });
        await tx.lilyPaymentReconciliation.create({
          data: {
            paymentId: row.id,
            expectedGrossCents: access.order.grandTotalCents,
            reportedGrossCents: providerResult.paidCents ?? 0,
            feeCents: 0,
            netCents: providerResult.paidCents ?? 0,
            discrepancyCents: (providerResult.paidCents ?? 0) - access.order.grandTotalCents,
            status: "discrepant",
            providerReference: providerResult.providerReference,
            note: "Valor aprovado pelo processador diverge do valor do pedido.",
            reconciledBy: `provider:${provider.id}`
          }
        });
      } else if (exactApproval && access.order.status === "awaiting_payment") {
        await tx.lilyPaymentEvent.create({
          data: {
            paymentId: row.id,
            source: `provider:${provider.id}`,
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
            actor: `provider:${provider.id}`
          }
        });
      }

      return tx.lilyPayment.findUnique({ where: { id: row.id }, include: paymentInclude });
    });

    return reply.code(201).send(serializePayment(created));
  });

  app.get("/api/v1/lily/payments/:id", async (request) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    let payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    await requireOrderPaymentAccess(request, payment.orderId, false);

    if (payment.status === "pending" && payment.provider !== "manual" && payment.providerPaymentId) {
      const provider = lilyPaymentProvider(payment.provider);
      if (provider.getPayment) {
        try {
          const remote = await provider.getPayment(payment.providerPaymentId);
          payment = await applyRemotePaymentState(payment, remote, `provider:${payment.provider}:poll`) as typeof payment;
        } catch {
          // A consulta do cliente pode usar o último estado conhecido se o provedor estiver temporariamente indisponível.
        }
      }
    }

    return serializePayment(payment);
  });

  app.get("/api/v1/lily/orders/:orderId/payments", async (request) => {
    const { orderId } = z.object({ orderId: idSchema }).parse(request.params);
    const access = await requireOrderPaymentAccess(request, orderId, false);
    const payments = await lilyPrisma.lilyPayment.findMany({
      where: { orderId },
      include: paymentInclude,
      orderBy: { createdAt: "desc" }
    });
    return {
      order: {
        id: access.order.id,
        orderNumber: access.order.orderNumber,
        status: access.order.status,
        amountCents: access.order.grandTotalCents,
        currency: "BRL"
      },
      payments: payments.map((payment) => serializePayment(payment))
    };
  });

  app.post("/api/v1/lily/payments/webhooks/mercado-pago", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const body = request.body && typeof request.body === "object"
      ? request.body as Record<string, any>
      : {};
    const dataId = String(query["data.id"] ?? query.data_id ?? body.data?.id ?? "").trim();
    const requestId = typeof request.headers["x-request-id"] === "string"
      ? request.headers["x-request-id"].trim()
      : "";
    const signature = typeof request.headers["x-signature"] === "string"
      ? request.headers["x-signature"].trim()
      : "";

    if (!dataId || !requestId || !signature) {
      throw new ApiError(400, "Webhook de pagamento incompleto.", { code: "LILY_PAYMENT_WEBHOOK_INVALID" });
    }
    if (!verifyMercadoPagoWebhookSignature({ signature, requestId, dataId })) {
      throw new ApiError(401, "Assinatura do webhook inválida.", { code: "LILY_PAYMENT_WEBHOOK_SIGNATURE" });
    }

    const providerEventId = `mercado_pago:${requestId}:${dataId}`;
    const duplicate = await lilyPrisma.lilyPaymentEvent.findUnique({ where: { providerEventId } });
    if (duplicate) return reply.code(204).send();

    const payment = await lilyPrisma.lilyPayment.findFirst({
      where: { provider: "mercado_pago", providerPaymentId: dataId },
      include: paymentInclude
    });
    if (!payment) return reply.code(204).send();

    const provider = lilyPaymentProvider("mercado_pago");
    if (!provider.getPayment) return reply.code(204).send();
    const remote = await provider.getPayment(dataId);
    await applyRemotePaymentState(payment, remote, "webhook:mercado_pago", providerEventId);
    return reply.code(204).send();
  });

  app.get("/api/v1/lily/admin/payments/settings", async (request) => {
    await requireLilyStaff(request);
    const settings = await getLilyOperationalSettings();
    const mercadoPago = mercadoPagoConfiguration();
    const cookLilyPix = cookLilyPixConfiguration();
    return {
      paymentsEnabled: settings.paymentsEnabled,
      paymentProvider: settings.paymentProvider,
      manualPixEnabled: settings.manualPixEnabled,
      manualPixInstructions: settings.manualPixInstructions,
      mercadoPagoPixEnabled: settings.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: settings.mercadoPagoCardEnabled,
      cookLilyPix: {
        keyConfigured: cookLilyPix.keyConfigured,
        merchantNameConfigured: cookLilyPix.merchantNameConfigured,
        merchantCityConfigured: cookLilyPix.merchantCityConfigured,
        ready: cookLilyPix.ready
      },
      mercadoPago: {
        accessTokenConfigured: mercadoPago.accessTokenConfigured,
        publicKeyConfigured: Boolean(mercadoPago.publicKey),
        webhookSecretConfigured: mercadoPago.webhookSecretConfigured,
        pixReady: mercadoPago.pixReady,
        cardReady: mercadoPago.cardReady
      }
    };
  });

  app.patch("/api/v1/lily/admin/payments/settings", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = paymentSettingsSchema.parse(request.body);
    const current = await getLilyOperationalSettings();
    const merged = { ...current, ...input };
    const mercadoPago = mercadoPagoConfiguration();
    const cookLilyPix = cookLilyPixConfiguration();

    if (merged.paymentsEnabled && merged.paymentProvider === "manual"
      && (!merged.manualPixEnabled || !merged.manualPixInstructions?.trim())) {
      throw new ApiError(400, "Configure e habilite o Pix manual antes de abrir pagamentos.", {
        code: "LILY_PAYMENT_CONFIGURATION_REQUIRED"
      });
    }
    if (merged.paymentsEnabled && merged.paymentProvider === "cooklily_pix" && !cookLilyPix.ready) {
      throw new ApiError(400, "Configure chave Pix, nome e cidade da CookLily na VPS antes de abrir pagamentos.", {
        code: "LILY_COOKLILY_PIX_CONFIGURATION_REQUIRED"
      });
    }
    if (merged.paymentsEnabled && merged.paymentProvider === "mercado_pago") {
      if (!merged.mercadoPagoPixEnabled && !merged.mercadoPagoCardEnabled) {
        throw new ApiError(400, "Habilite Pix ou cartão antes de abrir pagamentos.", {
          code: "LILY_PAYMENT_METHOD_REQUIRED"
        });
      }
      if (merged.mercadoPagoPixEnabled && !mercadoPago.pixReady) {
        throw new ApiError(400, "Credenciais Pix do Mercado Pago ainda não estão completas.", {
          code: "LILY_MERCADO_PAGO_PIX_CONFIGURATION_REQUIRED"
        });
      }
      if (merged.mercadoPagoCardEnabled && !mercadoPago.cardReady) {
        throw new ApiError(400, "Credenciais de cartão do Mercado Pago ainda não estão completas.", {
          code: "LILY_MERCADO_PAGO_CARD_CONFIGURATION_REQUIRED"
        });
      }
    }

    const updated = await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        ...(input.paymentsEnabled === undefined ? {} : { paymentsEnabled: input.paymentsEnabled }),
        ...(input.paymentProvider === undefined ? {} : { paymentProvider: input.paymentProvider }),
        ...(input.manualPixEnabled === undefined ? {} : { manualPixEnabled: input.manualPixEnabled }),
        ...(input.manualPixInstructions === undefined ? {} : { manualPixInstructions: input.manualPixInstructions || null }),
        ...(input.mercadoPagoPixEnabled === undefined ? {} : { mercadoPagoPixEnabled: input.mercadoPagoPixEnabled }),
        ...(input.mercadoPagoCardEnabled === undefined ? {} : { mercadoPagoCardEnabled: input.mercadoPagoCardEnabled })
      }
    });
    await auditLilyAdmin(context.user.id, "update", "payment-settings", "default", {
      paymentsEnabled: input.paymentsEnabled,
      paymentProvider: input.paymentProvider,
      manualPixEnabled: input.manualPixEnabled,
      manualPixInstructionsChanged: input.manualPixInstructions !== undefined,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled
    });
    return {
      paymentsEnabled: updated.paymentsEnabled,
      paymentProvider: updated.paymentProvider,
      manualPixEnabled: updated.manualPixEnabled,
      manualPixInstructions: updated.manualPixInstructions,
      mercadoPagoPixEnabled: updated.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: updated.mercadoPagoCardEnabled,
      cookLilyPix: {
        keyConfigured: cookLilyPix.keyConfigured,
        merchantNameConfigured: cookLilyPix.merchantNameConfigured,
        merchantCityConfigured: cookLilyPix.merchantCityConfigured,
        ready: cookLilyPix.ready
      },
      mercadoPago: {
        accessTokenConfigured: mercadoPago.accessTokenConfigured,
        publicKeyConfigured: Boolean(mercadoPago.publicKey),
        webhookSecretConfigured: mercadoPago.webhookSecretConfigured,
        pixReady: mercadoPago.pixReady,
        cardReady: mercadoPago.cardReady
      }
    };
  });

  app.get("/api/v1/lily/admin/payments", async (request) => {
    await requireLilyStaff(request);
    const query = z.object({
      status: z.string().trim().max(40).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100)
    }).parse(request.query);
    const payments = await lilyPrisma.lilyPayment.findMany({
      where: query.status ? { status: query.status } : {},
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
      take: query.limit
    });
    return {
      payments: payments.map((payment) => ({
        ...serializePayment(payment, true),
        order: {
          id: payment.order.id,
          orderNumber: payment.order.orderNumber,
          phone: payment.order.phoneNormalized,
          status: payment.order.status,
          grandTotalCents: payment.order.grandTotalCents,
          createdAt: payment.order.createdAt
        }
      }))
    };
  });

  app.post("/api/v1/lily/admin/payments/:id/confirm", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = confirmationSchema.parse(request.body);
    const existing = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!existing) throw new ApiError(404, "Pagamento não encontrado.");
    if (!["manual", "cooklily_pix"].includes(existing.provider)) {
      throw new ApiError(409, "Pagamentos automáticos só podem ser confirmados pelo processador.", {
        code: "LILY_PAYMENT_PROVIDER_CONFIRMATION_REQUIRED"
      });
    }
    if (existing.status === "approved") return serializePayment(existing, true);
    if (existing.status !== "pending") {
      throw new ApiError(409, "Somente pagamento pendente pode ser confirmado.", {
        code: "LILY_PAYMENT_CONFIRM_STATE",
        paymentStatus: existing.status
      });
    }
    if (existing.order.status !== "awaiting_payment") {
      throw new ApiError(409, "Pedido não está aguardando pagamento.", {
        code: "LILY_ORDER_PAYMENT_STATE",
        orderStatus: existing.order.status
      });
    }

    const reportedGrossCents = input.reportedGrossCents ?? existing.amountCents;
    const netCents = input.netCents ?? Math.max(0, reportedGrossCents - input.feeCents);
    const reconciliation = reconciliationValues(existing.amountCents, {
      reportedGrossCents,
      feeCents: input.feeCents,
      netCents,
      providerReference: input.providerReference,
      note: input.note
    });
    const now = new Date();

    await lilyPrisma.$transaction([
      lilyPrisma.lilyPayment.update({
        where: { id },
        data: {
          status: "approved",
          providerReference: input.providerReference,
          approvedAt: now
        }
      }),
      lilyPrisma.lilyPaymentEvent.create({
        data: {
          paymentId: id,
          source: `admin:${context.user.id}`,
          eventType: "payment.approved",
          fromStatus: existing.status,
          toStatus: "approved",
          payloadJson: safeEventPayload({ providerReference: input.providerReference })
        }
      }),
      lilyPrisma.lilyPaymentReconciliation.create({
        data: {
          paymentId: id,
          ...reconciliation,
          providerReference: input.providerReference,
          note: input.note,
          reconciledBy: context.user.id
        }
      }),
      lilyPrisma.lilyOrder.update({
        where: { id: existing.orderId },
        data: { status: "paid", paidAt: now }
      }),
      lilyPrisma.lilyOrderStatusEvent.create({
        data: {
          orderId: existing.orderId,
          fromStatus: existing.order.status,
          toStatus: "paid",
          actor: `admin:${context.user.id}`
        }
      })
    ]);

    await auditLilyAdmin(context.user.id, "payment.approve", "payment", id, {
      providerReference: input.providerReference,
      reportedGrossCents,
      feeCents: input.feeCents,
      netCents,
      reconciliationStatus: reconciliation.status
    });
    const updated = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    return serializePayment(updated, true);
  });

  app.post("/api/v1/lily/admin/payments/:id/cancel", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    if (payment.status === "cancelled") return serializePayment(payment, true);
    if (payment.status !== "pending") {
      throw new ApiError(409, "Somente pagamento pendente pode ser cancelado.", { code: "LILY_PAYMENT_CANCEL_STATE" });
    }

    const provider = lilyPaymentProvider(payment.provider);
    if (provider.cancelPayment && payment.providerPaymentId) {
      const remote = await provider.cancelPayment(payment.providerPaymentId, `cooklily-cancel-${payment.id}`);
      if (remote.status !== "cancelled") {
        throw new ApiError(502, "O processador não confirmou o cancelamento.", {
          code: "LILY_PAYMENT_PROVIDER_CANCEL_PENDING"
        });
      }
      await applyRemotePaymentState(payment, remote, `admin:${context.user.id}`);
    } else {
      const now = new Date();
      await lilyPrisma.$transaction([
        lilyPrisma.lilyPayment.update({ where: { id }, data: { status: "cancelled", cancelledAt: now } }),
        lilyPrisma.lilyPaymentEvent.create({
          data: {
            paymentId: id,
            source: `admin:${context.user.id}`,
            eventType: "payment.cancelled",
            fromStatus: "pending",
            toStatus: "cancelled"
          }
        })
      ]);
    }

    await auditLilyAdmin(context.user.id, "payment.cancel", "payment", id, { provider: payment.provider });
    const updated = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    return serializePayment(updated, true);
  });

  app.post("/api/v1/lily/admin/payments/:id/reconcile", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = reconciliationSchema.parse(request.body);
    const payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    const values = reconciliationValues(payment.amountCents, input);
    const created = await lilyPrisma.lilyPaymentReconciliation.create({
      data: {
        paymentId: id,
        ...values,
        providerReference: input.providerReference || null,
        note: input.note,
        reconciledBy: context.user.id
      }
    });
    await auditLilyAdmin(context.user.id, "payment.reconcile", "payment", id, {
      ...values,
      providerReference: input.providerReference
    });
    return created;
  });

  app.post("/api/v1/lily/admin/payments/:id/refund", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = refundSchema.parse(request.body);
    let payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    if (!["approved", "partially_refunded"].includes(payment.status)) {
      throw new ApiError(409, "Pagamento não está elegível para estorno.", { code: "LILY_PAYMENT_REFUND_STATE" });
    }
    const remaining = payment.amountCents - payment.refundedCents;
    if (input.amountCents > remaining) {
      throw new ApiError(400, "Valor de estorno excede o saldo pago.", {
        code: "LILY_PAYMENT_REFUND_AMOUNT",
        remainingCents: remaining
      });
    }

    let providerReference = input.providerReference ?? null;
    const provider = lilyPaymentProvider(payment.provider);
    if (provider.refundPayment) {
      const remote = await provider.refundPayment({
        providerPaymentId: payment.providerPaymentId,
        providerReference: payment.providerReference,
        amountCents: input.amountCents,
        remainingCents: remaining,
        idempotencyKey: `cooklily-refund-${payment.id}-${payment.refundedCents}-${input.amountCents}`
      });
      if (!["partially_refunded", "refunded"].includes(remote.status)) {
        throw new ApiError(502, "O processador não confirmou o estorno.", {
          code: "LILY_PAYMENT_PROVIDER_REFUND_PENDING"
        });
      }
      providerReference = remote.operationReference ?? remote.providerReference ?? payment.providerReference;
      payment = await applyRemotePaymentState(payment, remote, `admin:${context.user.id}`) as typeof payment;
    } else {
      if (!providerReference) {
        throw new ApiError(400, "Informe a referência financeira do estorno manual.", {
          code: "LILY_PAYMENT_REFUND_REFERENCE_REQUIRED"
        });
      }
      const refundedCents = payment.refundedCents + input.amountCents;
      const full = refundedCents === payment.amountCents;
      const nextStatus = full ? "refunded" : "partially_refunded";
      const now = new Date();
      const operations: any[] = [
        lilyPrisma.lilyPayment.update({
          where: { id },
          data: {
            status: nextStatus,
            refundedCents,
            ...(full ? { refundedAt: now } : {})
          }
        }),
        lilyPrisma.lilyPaymentEvent.create({
          data: {
            paymentId: id,
            source: `admin:${context.user.id}`,
            eventType: full ? "payment.refunded" : "payment.partially_refunded",
            fromStatus: payment.status,
            toStatus: nextStatus,
            payloadJson: safeEventPayload({ amountCents: input.amountCents, providerReference })
          }
        })
      ];
      if (full && payment.order.status === "paid") {
        operations.push(
          lilyPrisma.lilyOrder.update({ where: { id: payment.orderId }, data: { status: "refunded" } }),
          lilyPrisma.lilyOrderStatusEvent.create({
            data: {
              orderId: payment.orderId,
              fromStatus: payment.order.status,
              toStatus: "refunded",
              actor: `admin:${context.user.id}`
            }
          })
        );
      }
      await lilyPrisma.$transaction(operations);
    }

    await lilyPrisma.lilyPaymentReconciliation.create({
      data: {
        paymentId: id,
        expectedGrossCents: -input.amountCents,
        reportedGrossCents: -input.amountCents,
        feeCents: 0,
        netCents: -input.amountCents,
        discrepancyCents: 0,
        status: "matched",
        providerReference,
        note: input.note,
        reconciledBy: context.user.id
      }
    });

    await auditLilyAdmin(context.user.id, "payment.refund", "payment", id, {
      amountCents: input.amountCents,
      providerReference,
      provider: payment.provider
    });
    const updated = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    return serializePayment(updated, true);
  });
}
