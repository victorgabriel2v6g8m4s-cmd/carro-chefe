import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { getOptionalLilySession, requireLilyCsrf } from "./auth";
import { getLilyOperationalSettings } from "./fulfillment";
import { lilyPaymentProvider } from "./payment-provider";

const idSchema = z.string().trim().min(1).max(120);
const moneySchema = z.number().int().min(0).max(10_000_000);
const manualPixMethod = z.literal("manual_pix");

const createPaymentSchema = z.object({
  orderId: idSchema,
  method: manualPixMethod
}).strict();

const paymentSettingsSchema = z.object({
  paymentsEnabled: z.boolean().optional(),
  paymentProvider: z.literal("manual").optional(),
  manualPixEnabled: z.boolean().optional(),
  manualPixInstructions: z.string().trim().max(2000).nullable().optional()
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
  providerReference: z.string().trim().min(2).max(160),
  note: z.string().trim().max(500).nullable().optional()
}).strict();

const paymentInclude = {
  order: true,
  events: { orderBy: { createdAt: "asc" as const } },
  reconciliations: { orderBy: { createdAt: "desc" as const } }
};

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

function serializePayment(payment: any) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber ?? null,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    providerReference: payment.providerReference,
    instructions: payment.instructionsSnapshot,
    expiresAt: payment.expiresAt,
    approvedAt: payment.approvedAt,
    failedAt: payment.failedAt,
    cancelledAt: payment.cancelledAt,
    refundedAt: payment.refundedAt,
    refundedCents: payment.refundedCents,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    events: (payment.events ?? []).map((event: any) => ({
      source: event.source,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      createdAt: event.createdAt
    })),
    reconciliations: (payment.reconciliations ?? []).map((row: any) => ({
      expectedGrossCents: row.expectedGrossCents,
      reportedGrossCents: row.reportedGrossCents,
      feeCents: row.feeCents,
      netCents: row.netCents,
      discrepancyCents: row.discrepancyCents,
      status: row.status,
      providerReference: row.providerReference,
      note: row.note,
      createdAt: row.createdAt
    }))
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

export async function lilyPaymentRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/payments/config", async () => {
    const settings = await getLilyOperationalSettings();
    return {
      enabled: settings.paymentsEnabled,
      providerConfigured: settings.paymentProvider !== "manual" || Boolean(settings.manualPixInstructions?.trim()),
      methods: settings.paymentsEnabled && settings.manualPixEnabled && settings.manualPixInstructions?.trim()
        ? [{ id: "manual_pix", label: "Pix", confirmation: "manual" }]
        : []
    };
  });

  app.post("/api/v1/lily/payments", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = createPaymentSchema.parse(request.body);
    const idempotencyKey = readIdempotencyKey(request);
    const access = await requireOrderPaymentAccess(request, input.orderId, true);
    const settings = await getLilyOperationalSettings();

    if (!settings.paymentsEnabled) {
      throw new ApiError(503, "Pagamentos online ainda não estão habilitados.", { code: "LILY_PAYMENTS_DISABLED" });
    }
    if (input.method === "manual_pix" && (!settings.manualPixEnabled || !settings.manualPixInstructions?.trim())) {
      throw new ApiError(503, "Pix ainda não está configurado.", { code: "LILY_PIX_DISABLED" });
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
        method: input.method,
        status: { in: ["pending", "approved", "partially_refunded"] }
      },
      include: paymentInclude,
      orderBy: { createdAt: "desc" }
    });
    if (active) return reply.code(200).send(serializePayment(active));

    const paymentId = crypto.randomUUID();
    const provider = lilyPaymentProvider(settings.paymentProvider);
    const providerResult = await provider.createPayment({
      paymentId,
      orderId: access.order.id,
      orderNumber: access.order.orderNumber,
      amountCents: access.order.grandTotalCents,
      currency: "BRL",
      method: input.method,
      instructions: settings.manualPixInstructions!.trim()
    });

    const created = await lilyPrisma.lilyPayment.create({
      data: {
        id: paymentId,
        orderId: access.order.id,
        idempotencyKey,
        provider: provider.id,
        method: input.method,
        status: providerResult.status,
        amountCents: access.order.grandTotalCents,
        currency: "BRL",
        providerPaymentId: providerResult.providerPaymentId,
        instructionsSnapshot: providerResult.instructions,
        expiresAt: providerResult.expiresAt,
        events: {
          create: {
            source: access.context ? `customer:${access.context.user.id}` : "guest",
            eventType: "payment.created",
            fromStatus: null,
            toStatus: providerResult.status,
            payloadHash: crypto.createHash("sha256").update(idempotencyKey).digest("hex")
          }
        }
      },
      include: paymentInclude
    });
    return reply.code(201).send(serializePayment(created));
  });

  app.get("/api/v1/lily/payments/:id", async (request) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    await requireOrderPaymentAccess(request, payment.orderId, false);
    return serializePayment(payment);
  });

  app.get("/api/v1/lily/orders/:orderId/payments", async (request) => {
    const { orderId } = z.object({ orderId: idSchema }).parse(request.params);
    await requireOrderPaymentAccess(request, orderId, false);
    const payments = await lilyPrisma.lilyPayment.findMany({
      where: { orderId },
      include: paymentInclude,
      orderBy: { createdAt: "desc" }
    });
    return { payments: payments.map(serializePayment) };
  });

  app.get("/api/v1/lily/admin/payments/settings", async (request) => {
    await requireLilyStaff(request);
    const settings = await getLilyOperationalSettings();
    return {
      paymentsEnabled: settings.paymentsEnabled,
      paymentProvider: settings.paymentProvider,
      manualPixEnabled: settings.manualPixEnabled,
      manualPixInstructions: settings.manualPixInstructions
    };
  });

  app.patch("/api/v1/lily/admin/payments/settings", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = paymentSettingsSchema.parse(request.body);
    const current = await getLilyOperationalSettings();
    const merged = { ...current, ...input };

    if (merged.paymentsEnabled && merged.paymentProvider === "manual"
      && (!merged.manualPixEnabled || !merged.manualPixInstructions?.trim())) {
      throw new ApiError(400, "Configure e habilite o Pix manual antes de abrir pagamentos.", {
        code: "LILY_PAYMENT_CONFIGURATION_REQUIRED"
      });
    }

    const updated = await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        ...(input.paymentsEnabled === undefined ? {} : { paymentsEnabled: input.paymentsEnabled }),
        ...(input.paymentProvider === undefined ? {} : { paymentProvider: input.paymentProvider }),
        ...(input.manualPixEnabled === undefined ? {} : { manualPixEnabled: input.manualPixEnabled }),
        ...(input.manualPixInstructions === undefined ? {} : { manualPixInstructions: input.manualPixInstructions || null })
      }
    });
    await auditLilyAdmin(context.user.id, "update", "payment-settings", "default", {
      paymentsEnabled: input.paymentsEnabled,
      paymentProvider: input.paymentProvider,
      manualPixEnabled: input.manualPixEnabled,
      manualPixInstructionsChanged: input.manualPixInstructions !== undefined
    });
    return {
      paymentsEnabled: updated.paymentsEnabled,
      paymentProvider: updated.paymentProvider,
      manualPixEnabled: updated.manualPixEnabled,
      manualPixInstructions: updated.manualPixInstructions
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
        ...serializePayment(payment),
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
    if (existing.status === "approved") return serializePayment(existing);
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
    return serializePayment(updated);
  });

  app.post("/api/v1/lily/admin/payments/:id/cancel", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw new ApiError(404, "Pagamento não encontrado.");
    if (payment.status === "cancelled") return serializePayment(payment);
    if (payment.status !== "pending") {
      throw new ApiError(409, "Somente pagamento pendente pode ser cancelado.", { code: "LILY_PAYMENT_CANCEL_STATE" });
    }
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
    await auditLilyAdmin(context.user.id, "payment.cancel", "payment", id);
    const updated = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    return serializePayment(updated);
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
    const payment = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
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
          payloadJson: safeEventPayload({
            amountCents: input.amountCents,
            providerReference: input.providerReference
          })
        }
      }),
      lilyPrisma.lilyPaymentReconciliation.create({
        data: {
          paymentId: id,
          expectedGrossCents: -input.amountCents,
          reportedGrossCents: -input.amountCents,
          feeCents: 0,
          netCents: -input.amountCents,
          discrepancyCents: 0,
          status: "matched",
          providerReference: input.providerReference,
          note: input.note,
          reconciledBy: context.user.id
        }
      })
    ];

    if (full && payment.order.status === "paid") {
      operations.push(
        lilyPrisma.lilyOrder.update({
          where: { id: payment.orderId },
          data: { status: "refunded" }
        }),
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
    await auditLilyAdmin(context.user.id, "payment.refund", "payment", id, {
      amountCents: input.amountCents,
      providerReference: input.providerReference,
      full
    });
    const updated = await lilyPrisma.lilyPayment.findUnique({ where: { id }, include: paymentInclude });
    return serializePayment(updated);
  });
}
