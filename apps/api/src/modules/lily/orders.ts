import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { lilyAttributionInputSchema, normalizeLilyAttribution } from "./attribution";
import { requireLilyStaff } from "./admin-security";
import { getOptionalLilySession, normalizeLilyPhone, requireLilyCsrf, requireLilySession } from "./auth";
import { logLilyVipAnalytics, requireVipProductAccess } from "./vip";
import { lilyAddressInputSchema, normalizeLilyAddress } from "./addresses";
import {
  lilyComboConfigurationSchema,
  lilyConfigurationSchema,
  quoteLilyComboConfiguration,
  quoteLilyConfiguration
} from "./configuration";
import { getLilyOperationalSettings, resolveLilyFulfillment } from "./fulfillment";
import { lilyLogisticsCodeConfiguration, lilyOrderSecurityCode } from "./logistics-codes";
import { serializeLilyRouteEstimate } from "./routing";
import { enqueueLilyWhatsAppStage, LILY_WHATSAPP_CONSENT_VERSION } from "./whatsapp";
import { calculateLilyCouponQuote, couponCodeListSchema, reserveLilyCouponRedemptions } from "./coupon-calculation";
import { lilyPaymentProvider, type LilyPaymentProviderRemoteState } from "./payment-provider";
import { reversePaidOrderPoints } from "./loyalty/service";
import { verifyLilyOrderAccessLink } from "./order-access-link";

const quantitySchema = z.number().int().min(1).max(20);
const noteSchema = z.string().trim().max(300).nullable().optional();
const moneySchema = z.number().int().min(0).max(10_000_000);

const productQuoteItemSchema = lilyConfigurationSchema.extend({
  kind: z.literal("product").default("product"),
  quantity: quantitySchema.default(1),
  note: noteSchema
}).strict();

const comboQuoteItemSchema = lilyComboConfigurationSchema.extend({
  kind: z.literal("combo"),
  quantity: quantitySchema.default(1),
  note: noteSchema
}).strict();

const quoteItemSchema = z.union([productQuoteItemSchema, comboQuoteItemSchema]);

const productOrderItemSchema = productQuoteItemSchema.extend({
  configurationHash: z.string().regex(/^[a-f0-9]{24}$/),
  expectedUnitPriceCents: moneySchema
}).strict();

const comboOrderItemSchema = comboQuoteItemSchema.extend({
  configurationHash: z.string().regex(/^[a-f0-9]{24}$/),
  expectedUnitPriceCents: moneySchema
}).strict();

const orderItemSchema = z.union([productOrderItemSchema, comboOrderItemSchema]);

const quoteSchema = z.object({
  fulfillmentType: z.enum(["pickup", "delivery"]),
  address: lilyAddressInputSchema.optional(),
  couponCodes: couponCodeListSchema,
  phone: z.string().trim().min(8).max(40).optional(),
  items: z.array(quoteItemSchema).min(1).max(30)
}).strict();

const orderSchema = z.object({
  replaceOrderId: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(8).max(40),
  fulfillmentType: z.enum(["pickup", "delivery"]),
  address: lilyAddressInputSchema.optional(),
  customerNote: z.string().trim().max(500).nullable().optional(),
  whatsappUpdatesOptIn: z.boolean().default(false),
  couponCodes: couponCodeListSchema,
  items: z.array(orderItemSchema).min(1).max(30),
  attribution: lilyAttributionInputSchema.optional()
}).strict();

type QuoteItemInput = z.infer<typeof quoteItemSchema>;
type OrderInput = z.infer<typeof orderSchema>;

async function quoteItems(items: QuoteItemInput[], userId?: string | null) {
  return Promise.all(items.map(async (item) => {
    if (item.kind === "combo") {
      await Promise.all(item.selections.map((selection) => requireVipProductAccess(selection.productId, userId)));
      const configuration = await quoteLilyComboConfiguration({
        comboId: item.comboId,
        selections: item.selections
      });
      return {
        ...configuration,
        quantity: item.quantity,
        note: item.note?.trim() || null,
        lineTotalCents: configuration.totalPriceCents * item.quantity
      };
    }

    await requireVipProductAccess(item.productId, userId);

    const configuration = await quoteLilyConfiguration({
      productId: item.productId,
      sizeMl: item.sizeMl,
      flavorIds: item.flavorIds,
      addons: item.addons
    });
    return {
      kind: "product" as const,
      ...configuration,
      quantity: item.quantity,
      note: item.note?.trim() || null,
      lineTotalCents: configuration.totalPriceCents * item.quantity
    };
  }));
}

async function calculateQuote(input: z.infer<typeof quoteSchema>, options: { allowClosed?: boolean; userId?: string | null } = {}) {
  const address = input.address ? normalizeLilyAddress(input.address) : undefined;
  const fulfillment = await resolveLilyFulfillment(input.fulfillmentType, address, options);
  const items = await quoteItems(input.items, options.userId);
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  if (subtotalCents < fulfillment.minimumOrderCents) {
    throw new ApiError(400, "Pedido abaixo do mínimo configurado.", {
      code: "LILY_ORDER_MINIMUM",
      minimumOrderCents: fulfillment.minimumOrderCents,
      subtotalCents
    });
  }
  const coupons = await calculateLilyCouponQuote({
    codes: input.couponCodes,
    items: items.map((item) => ({
      kind: item.kind,
      lineTotalCents: item.lineTotalCents,
      ...(item.kind === "product" ? { product: { id: item.product.id } } : { selections: item.selections.map((selection) => ({ product: { id: selection.product.id }, totalPriceCents: selection.totalPriceCents })) })
    })),
    subtotalCents,
    shippingCents: fulfillment.deliveryFeeCents,
    fulfillmentType: input.fulfillmentType,
    phone: input.phone,
    userId: options.userId,
    isVip: options.userId ? (await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: options.userId }, select: { status: true } }))?.status === "active" : false
  });
  return {
    items,
    fulfillment,
    subtotalCents,
    deliveryFeeCents: fulfillment.deliveryFeeCents,
    discountTotalCents: coupons.discountCents,
    couponDiscountCents: coupons.discountCents,
    couponProductDiscountCents: coupons.productDiscountCents,
    couponShippingDiscountCents: coupons.shippingDiscountCents,
    couponApplications: coupons.notices,
    couponRedemptionApplications: coupons.applications,
    grandTotalCents: subtotalCents + fulfillment.deliveryFeeCents - coupons.discountCents,
    address: address ?? null
  };
}

function fingerprint(input: {
  userId: string | null;
  phoneNormalized: string;
  order: OrderInput;
  address: ReturnType<typeof normalizeLilyAddress> | null;
  isHomologation: boolean;
}) {
  const canonical = {
    userId: input.userId,
    phoneNormalized: input.phoneNormalized,
    fulfillmentType: input.order.fulfillmentType,
    address: input.address,
    customerNote: input.order.customerNote?.trim() || null,
    whatsappUpdatesOptIn: input.order.whatsappUpdatesOptIn,
    couponCodes: input.order.couponCodes,
    items: input.order.items,
    attribution: normalizeLilyAttribution(input.order.attribution ?? {}),
    isHomologation: input.isHomologation
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function orderNumber() {
  return `CL-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

const orderInclude = {
  items: { include: { addons: true } },
  statusEvents: { orderBy: { createdAt: "asc" as const } },
  operationEvents: { orderBy: { createdAt: "asc" as const } },
  deliveryEvents: { orderBy: { createdAt: "asc" as const } },
  routeEstimate: true
};

async function findOrderById(id: string) {
  return lilyPrisma.lilyOrder.findUnique({ where: { id }, include: orderInclude });
}

function shouldExposeDeliveryCode(order: NonNullable<Awaited<ReturnType<typeof findOrderById>>>) {
  return order.fulfillmentType === "delivery"
    && ["picked_up", "left_pickup", "courier_arrived_delivery"].includes(order.deliveryStatus)
    && lilyLogisticsCodeConfiguration().ready;
}

function serializeOrder(
  order: Awaited<ReturnType<typeof findOrderById>>,
  guestAccessToken?: string | null,
  includeDeliveryCode = false
) {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    refundStatus: order.refundStatus,
    customerCancellationStatus: order.customerCancellationStatus,
    operationStatus: order.operationStatus,
    restaurantDecisionStatus: order.restaurantDecisionStatus,
    restaurantDecisionAt: order.restaurantDecisionAt,
    restaurantPrepEstimateMinutes: order.restaurantPrepEstimateMinutes,
    operationUpdatedAt: order.operationUpdatedAt,
    deliveryStatus: order.deliveryStatus,
    deliveryUpdatedAt: order.deliveryUpdatedAt,
    isHomologation: order.isHomologation,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    discountTotalCents: order.discountTotalCents,
    couponDiscountCents: order.couponDiscountCents,
    couponProductDiscountCents: order.couponProductDiscountCents,
    couponShippingDiscountCents: order.couponShippingDiscountCents,
    coupons: JSON.parse(order.couponsSnapshotJson),
    grandTotalCents: order.grandTotalCents,
    address: order.addressSnapshotJson ? JSON.parse(order.addressSnapshotJson) : null,
    customerNote: order.customerNote,
    whatsappUpdatesOptIn: order.whatsappUpdatesOptIn,
    createdAt: order.createdAt,
    routeEstimate: serializeLilyRouteEstimate(order.routeEstimate, {
      deliveryStatus: order.deliveryStatus,
      deliveryEvents: order.deliveryEvents
    }),
    ...(guestAccessToken ? { guestAccessToken } : {}),
    ...(includeDeliveryCode && shouldExposeDeliveryCode(order)
      ? { deliveryCode: lilyOrderSecurityCode(order.id, "delivery") }
      : {}),
    items: order.items.map((item) => ({
      id: item.id,
      kind: item.variantId === "combo" ? "combo" : "product",
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      sizeMl: item.sizeMl,
      configurationHash: item.configurationHash,
      configuration: JSON.parse(item.configurationSnapshotJson),
      flavors: JSON.parse(item.flavorsSnapshotJson),
      allergens: JSON.parse(item.allergenSnapshotJson),
      unitPriceCents: item.unitPriceSnapshotCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      note: item.customerNote,
      addons: item.addons.map((addon) => ({
        addonId: addon.addonId,
        name: addon.addonNameSnapshot,
        unitPriceCents: addon.unitPriceSnapshotCents,
        quantity: addon.quantity
      }))
    })),
    statusEvents: order.statusEvents.map((event) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      createdAt: event.createdAt
    })),
    operationEvents: order.operationEvents.map((event) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt
    })),
    deliveryEvents: order.deliveryEvents.map((event) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt
    }))
  };
}

function hashGuestAccessToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeStringEqual(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createGuestAccessToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashGuestAccessToken(token) };
}

function serializeGuestTrackingOrder(order: NonNullable<Awaited<ReturnType<typeof findOrderById>>>, cancellation: { enabled: boolean; windowMinutes: number }) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    refundStatus: order.refundStatus,
    customerCancellationStatus: order.customerCancellationStatus,
    customerCanCancel: cancellation.enabled
      && Date.now() <= order.createdAt.getTime() + cancellation.windowMinutes * 60_000
      && ["awaiting_payment", "paid"].includes(order.status)
      && order.operationStatus === "received"
      && ["not_ready", "not_applicable"].includes(order.deliveryStatus)
      && order.customerCancellationStatus !== "confirmed",
    operationStatus: order.operationStatus,
    restaurantDecisionStatus: order.restaurantDecisionStatus,
    restaurantDecisionAt: order.restaurantDecisionAt,
    restaurantPrepEstimateMinutes: order.restaurantPrepEstimateMinutes,
    operationUpdatedAt: order.operationUpdatedAt,
    deliveryStatus: order.deliveryStatus,
    deliveryUpdatedAt: order.deliveryUpdatedAt,
    isHomologation: order.isHomologation,
    grandTotalCents: order.grandTotalCents,
    whatsappUpdatesOptIn: order.whatsappUpdatesOptIn,
    createdAt: order.createdAt,
    routeEstimate: serializeLilyRouteEstimate(order.routeEstimate, {
      deliveryStatus: order.deliveryStatus,
      deliveryEvents: order.deliveryEvents
    }),
    ...(shouldExposeDeliveryCode(order)
      ? { deliveryCode: lilyOrderSecurityCode(order.id, "delivery") }
      : {}),
    items: order.items.map((item) => ({
      id: item.id,
      kind: item.variantId === "combo" ? "combo" : "product",
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      sizeMl: item.sizeMl,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      flavors: (JSON.parse(item.flavorsSnapshotJson) as Array<{ name?: string }>).map((flavor) => ({
        name: typeof flavor.name === "string" ? flavor.name : ""
      })).filter((flavor) => flavor.name),
      allergens: JSON.parse(item.allergenSnapshotJson),
      addons: item.addons.map((addon) => ({
        name: addon.addonNameSnapshot,
        quantity: addon.quantity
      }))
    })),
    statusEvents: order.statusEvents.map((event) => ({
      toStatus: event.toStatus,
      createdAt: event.createdAt
    })),
    operationEvents: order.operationEvents.map((event) => ({
      toStatus: event.toStatus,
      createdAt: event.createdAt
    })),
    deliveryEvents: order.deliveryEvents.map((event) => ({
      toStatus: event.toStatus,
      createdAt: event.createdAt
    }))
  };
}

function homologationRequested(request: FastifyRequest) {
  return request.headers["x-lily-homologation"] === "1";
}

async function requireHomologationAccess(request: FastifyRequest, requireCsrf = false) {
  if (!homologationRequested(request)) return false;
  await requireLilyStaff(request, requireCsrf);
  return true;
}

function readIdempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[A-Za-z0-9._:-]{16,120}$/.test(value)) {
    throw new ApiError(400, "Idempotency-Key inválido ou ausente.", { code: "LILY_IDEMPOTENCY_KEY_REQUIRED" });
  }
  return value;
}

function withoutExpectations(item: z.infer<typeof orderItemSchema>): QuoteItemInput {
  if (item.kind === "combo") {
    return {
      kind: "combo",
      comboId: item.comboId,
      selections: item.selections,
      quantity: item.quantity,
      note: item.note
    };
  }
  return {
    kind: "product",
    productId: item.productId,
    sizeMl: item.sizeMl,
    flavorIds: item.flavorIds,
    addons: item.addons,
    quantity: item.quantity,
    note: item.note
  };
}

export async function lilyOrderRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/orders/quote", {
    config: { rateLimit: { max: 40, timeWindow: "1 minute" } }
  }, async (request) => {
    const isHomologation = await requireHomologationAccess(request);
    const context = await getOptionalLilySession(request);
    const quote = await calculateQuote(quoteSchema.parse(request.body), { allowClosed: isHomologation, userId: context?.user.id });
    const { couponRedemptionApplications: _internal, ...publicQuote } = quote;
    return publicQuote;
  });

  app.post("/api/v1/lily/orders", {
    config: { rateLimit: { max: 8, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = orderSchema.parse(request.body);
    const idempotencyKey = readIdempotencyKey(request);
    const context = await getOptionalLilySession(request);
    if (context) requireLilyCsrf(request, context);
    const isHomologation = await requireHomologationAccess(request, true);
    const phoneNormalized = normalizeLilyPhone(input.phone);
    if (!phoneNormalized) throw new ApiError(400, "Telefone inválido.", { code: "LILY_INVALID_PHONE" });
    const editSettings = input.replaceOrderId ? await getLilyOperationalSettings() : null;
    const editAccessToken = request.headers["x-lily-order-token"];
    if (input.replaceOrderId) {
      const original = await lilyPrisma.lilyOrder.findUnique({
        where: { id: input.replaceOrderId },
        include: { payments: { select: { status: true } } }
      });
      if (typeof editAccessToken !== "string" && !context) {
        throw new ApiError(401, "O link de edição perdeu a validade. Reabra o botão no WhatsApp.", { code: "LILY_ORDER_TOKEN_REQUIRED" });
      }
      const signed = typeof editAccessToken === "string"
        && verifyLilyOrderAccessLink(editAccessToken)?.orderId === input.replaceOrderId;
      const guest = typeof editAccessToken === "string" && original?.guestAccessTokenHash !== null
        && original?.guestAccessTokenHash !== undefined
        && timingSafeStringEqual(hashGuestAccessToken(editAccessToken), original.guestAccessTokenHash);
      const owner = Boolean(context && original?.userId === context.user.id);
      if (!original || (!signed && !guest && !owner)) {
        throw new ApiError(404, "Pedido não encontrado ou sem acesso.", { code: "LILY_ORDER_NOT_FOUND" });
      }
      if (owner && context) requireLilyCsrf(request, context);
      const editWindowOpen = editSettings?.customerCancellationEnabled
        && Date.now() <= original.createdAt.getTime() + editSettings.customerCancellationWindowMinutes * 60_000;
      const hasActivePayment = original.payments.some((payment) => ["pending", "approved", "partially_refunded"].includes(payment.status));
      if (!editWindowOpen || original.status !== "awaiting_payment" || original.operationStatus !== "received"
        || !["not_ready", "not_applicable"].includes(original.deliveryStatus) || hasActivePayment
        || original.customerCancellationStatus !== "not_requested") {
        throw new ApiError(409, "Este pedido não pode mais ser editado.", { code: "LILY_ORDER_NOT_EDITABLE" });
      }
      if (original.userId && original.userId !== context?.user.id) {
        throw new ApiError(404, "Pedido não encontrado ou sem acesso.", { code: "LILY_ORDER_NOT_FOUND" });
      }
      if ((original.userId && !owner) || (!original.userId && context)
        || original.phoneNormalized !== phoneNormalized) {
        throw new ApiError(409, "Os dados de identificação do pedido editado precisam permanecer iguais.", { code: "LILY_ORDER_EDIT_IDENTITY_CHANGED" });
      }
    }

    const address = input.address ? normalizeLilyAddress(input.address) : null;
    const requestFingerprint = fingerprint({
      userId: context?.user.id ?? null,
      phoneNormalized,
      order: input,
      address,
      isHomologation
    });

    const existing = await lilyPrisma.lilyOrder.findUnique({ where: { idempotencyKey }, include: orderInclude });
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ApiError(409, "Idempotency-Key já foi usado com outro pedido.", { code: "LILY_IDEMPOTENCY_CONFLICT" });
      }
      if (!existing.userId) {
        const guest = createGuestAccessToken();
        const rotated = await lilyPrisma.lilyOrder.update({
          where: { id: existing.id },
          data: { guestAccessTokenHash: guest.hash },
          include: orderInclude
        });
        return reply.code(200).send(serializeOrder(rotated, guest.token));
      }
      return reply.code(200).send(serializeOrder(existing));
    }

    const quote = await calculateQuote({
      fulfillmentType: input.fulfillmentType,
      address: input.address,
      couponCodes: input.couponCodes,
      phone: input.phone,
      items: input.items.map(withoutExpectations)
    }, { allowClosed: isHomologation, userId: context?.user.id });

    for (let index = 0; index < input.items.length; index += 1) {
      const expected = input.items[index]!;
      const current = quote.items[index]!;
      if (expected.configurationHash !== current.configurationHash) {
        throw new ApiError(409, "A configuração do item mudou. Atualize o carrinho.", {
          code: "LILY_CONFIGURATION_CHANGED",
          itemIndex: index
        });
      }
      if (expected.expectedUnitPriceCents !== current.totalPriceCents) {
        throw new ApiError(409, "O preço de um item mudou. Recalcule o pedido antes de continuar.", {
          code: "LILY_PRICE_CHANGED",
          itemIndex: index,
          currentUnitPriceCents: current.totalPriceCents
        });
      }
    }

    const attribution = normalizeLilyAttribution(input.attribution ?? {});
    const guestAccess = context ? null : createGuestAccessToken();
    let created;
    try {
      created = await lilyPrisma.$transaction(async (tx) => {
        const order = await tx.lilyOrder.create({
        data: {
          orderNumber: orderNumber(),
          idempotencyKey,
          requestFingerprint,
          guestAccessTokenHash: guestAccess?.hash ?? null,
          userId: context?.user.id ?? null,
          phoneNormalized,
          fulfillmentType: input.fulfillmentType,
          status: "awaiting_payment",
          operationStatus: "received",
          deliveryStatus: input.fulfillmentType === "delivery" ? "not_ready" : "not_applicable",
          deliveryUpdatedAt: new Date(),
          isHomologation,
          subtotalCents: quote.subtotalCents,
          deliveryFeeCents: quote.deliveryFeeCents,
          discountTotalCents: quote.discountTotalCents,
          couponDiscountCents: quote.couponDiscountCents,
          couponProductDiscountCents: quote.couponProductDiscountCents,
          couponShippingDiscountCents: quote.couponShippingDiscountCents,
          couponsSnapshotJson: JSON.stringify(quote.couponRedemptionApplications),
          grandTotalCents: quote.grandTotalCents,
          addressSnapshotJson: quote.address ? JSON.stringify(quote.address) : null,
          customerNote: input.customerNote?.trim() || null,
          whatsappUpdatesOptIn: input.whatsappUpdatesOptIn,
          whatsappConsentAt: input.whatsappUpdatesOptIn ? new Date() : null,
          whatsappConsentVersion: input.whatsappUpdatesOptIn ? LILY_WHATSAPP_CONSENT_VERSION : null,
          laQr: attribution.laQr,
          laCampaign: attribution.laCampaign,
          laVariant: attribution.laVariant,
          items: {
            create: quote.items.map((item) => item.kind === "combo" ? {
              productId: item.combo.id,
              variantId: "combo",
              productNameSnapshot: item.combo.name,
              variantNameSnapshot: "Combo",
              sizeMl: 0,
              configurationHash: item.configurationHash,
              configurationSnapshotJson: JSON.stringify({
                kind: "combo",
                combo: item.combo,
                selections: item.selections.map((selection) => ({
                  configurationHash: selection.configurationHash,
                  product: selection.product,
                  variant: selection.variant,
                  sizeMl: selection.sizeMl,
                  flavors: selection.flavors,
                  addons: selection.addons,
                  allergens: selection.allergens,
                  totalPriceCents: selection.totalPriceCents
                }))
              }),
              flavorsSnapshotJson: "[]",
              allergenSnapshotJson: JSON.stringify(item.allergens),
              unitPriceSnapshotCents: item.totalPriceCents,
              quantity: item.quantity,
              lineTotalCents: item.lineTotalCents,
              customerNote: item.note,
              addons: {
                create: item.selections.flatMap((selection) => selection.addons.map((addon) => ({
                  addonId: addon.addonId,
                  addonNameSnapshot: addon.name,
                  unitPriceSnapshotCents: addon.unitPriceCents,
                  quantity: addon.quantity
                })))
              }
            } : {
              productId: item.product.id,
              variantId: item.variant.id,
              productNameSnapshot: item.product.name,
              variantNameSnapshot: item.variant.name,
              sizeMl: item.sizeMl,
              configurationHash: item.configurationHash,
              configurationSnapshotJson: JSON.stringify({
                kind: "product",
                productId: item.product.id,
                sizeMl: item.sizeMl,
                flavorIds: item.flavors.map((flavor) => flavor.id),
                addons: item.addons.map((addon) => ({ addonId: addon.addonId, quantity: addon.quantity }))
              }),
              flavorsSnapshotJson: JSON.stringify(item.flavors),
              allergenSnapshotJson: JSON.stringify(item.allergens),
              unitPriceSnapshotCents: item.totalPriceCents,
              quantity: item.quantity,
              lineTotalCents: item.lineTotalCents,
              customerNote: item.note,
              addons: {
                create: item.addons.map((addon) => ({
                  addonId: addon.addonId,
                  addonNameSnapshot: addon.name,
                  unitPriceSnapshotCents: addon.unitPriceCents,
                  quantity: addon.quantity
                }))
              }
            })
          },
          statusEvents: {
            create: {
              fromStatus: null,
              toStatus: "awaiting_payment",
              actor: isHomologation
                ? `homologation:${context!.user.id}`
                : context ? `customer:${context.user.id}` : "guest"
            }
          },
          operationEvents: {
            create: {
              fromStatus: null,
              toStatus: "received",
              actor: "system:order_created"
            }
          },
          ...(input.whatsappUpdatesOptIn && !isHomologation
            ? {
                whatsappNotifications: {
                  create: {
                    stage: "awaiting_payment",
                    status: "pending",
                    nextAttemptAt: new Date()
                  }
                }
              }
            : {}),
          ...(input.fulfillmentType === "delivery"
            ? {
                deliveryEvents: {
                  create: {
                    fromStatus: null,
                    toStatus: "not_ready",
                    actor: "system:order_created"
                  }
                }
              }
            : {})
        },
        include: orderInclude
        });
        if (input.replaceOrderId) {
          const original = await tx.lilyOrder.findUnique({
            where: { id: input.replaceOrderId },
            include: { payments: { select: { status: true } } }
          });
          const hasActivePayment = original?.payments.some((payment) => ["pending", "approved", "partially_refunded"].includes(payment.status));
          if (!original || original.status !== "awaiting_payment" || original.operationStatus !== "received"
            || !["not_ready", "not_applicable"].includes(original.deliveryStatus)
            || original.customerCancellationStatus !== "not_requested" || hasActivePayment
            || !editSettings?.customerCancellationEnabled
            || Date.now() > original.createdAt.getTime() + editSettings.customerCancellationWindowMinutes * 60_000) {
            throw new ApiError(409, "O pedido original mudou e não pode ser substituído.", { code: "LILY_ORDER_NOT_EDITABLE" });
          }
          const cancelled = await tx.lilyOrder.updateMany({
            where: { id: original.id, status: "awaiting_payment", customerCancellationStatus: "not_requested" },
            data: {
              status: "cancelled",
              operationStatus: "cancelled",
              operationUpdatedAt: new Date(),
              customerCancellationStatus: "confirmed",
              customerCancellationRequestedAt: new Date(),
              ...(original.fulfillmentType === "delivery" ? { deliveryStatus: "cancelled", deliveryUpdatedAt: new Date() } : {})
            }
          });
          if (cancelled.count !== 1) {
            throw new ApiError(409, "O pedido original foi alterado simultaneamente e não pode ser substituído.", { code: "LILY_ORDER_NOT_EDITABLE" });
          }
          await tx.lilyOrder.update({
            where: { id: original.id },
            data: {
              statusEvents: { create: { fromStatus: original.status, toStatus: "cancelled", actor: context ? `customer:${context.user.id}` : "customer:order_edit" } },
              operationEvents: { create: { fromStatus: original.operationStatus, toStatus: "cancelled", actor: "system:order_replaced" } }
            }
          });
          const originalReservations = await tx.lilyCouponRedemption.findMany({ where: { orderId: original.id }, select: { couponId: true } });
          for (const reservation of originalReservations) {
            await tx.lilyCoupon.update({ where: { id: reservation.couponId }, data: { usesCount: { decrement: 1 } } });
          }
          await tx.lilyCouponRedemption.deleteMany({ where: { orderId: original.id } });
          await tx.lilyWhatsAppNotification.updateMany({
            where: { orderId: original.id, status: { in: ["pending", "failed"] } },
            data: { status: "skipped", lastErrorCode: "ORDER_REPLACED", lastErrorMessage: "Pedido substituído durante a edição pelo cliente." }
          });
        }
        await reserveLilyCouponRedemptions({
          tx,
          applications: quote.couponRedemptionApplications,
          orderId: order.id,
          phoneNormalized
        });
        return order;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        const raced = await lilyPrisma.lilyOrder.findUnique({ where: { idempotencyKey }, include: orderInclude });
        if (raced?.requestFingerprint === requestFingerprint) {
          if (!raced.userId) {
            const guest = createGuestAccessToken();
            const rotated = await lilyPrisma.lilyOrder.update({
              where: { id: raced.id },
              data: { guestAccessTokenHash: guest.hash },
              include: orderInclude
            });
            return reply.code(200).send(serializeOrder(rotated, guest.token));
          }
          return reply.code(200).send(serializeOrder(raced));
        }
      }
      throw error;
    }
    if (context) {
      const vip = await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id }, select: { status: true } });
      if (vip?.status === "active") await logLilyVipAnalytics(context.user.id, "vip_order_created", created.id);
    }
    return reply.code(201).send(serializeOrder(created, guestAccess?.token ?? null));
  });

  app.post("/api/v1/lily/orders/:id/cancel", {
    config: { rateLimit: { max: 6, timeWindow: "10 minutes" } }
  }, async (request) => {
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const context = await getOptionalLilySession(request);
    let order = await lilyPrisma.lilyOrder.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: "desc" } } }
    });
    const notFound = () => new ApiError(404, "Pedido não encontrado.", { code: "LILY_ORDER_NOT_FOUND" });
    if (!order) throw notFound();

    if (order.userId) {
      if (!context || context.user.id !== order.userId) throw notFound();
      requireLilyCsrf(request, context);
    } else {
      const supplied = request.headers["x-lily-order-token"];
      if (typeof supplied !== "string" || supplied.length < 32 || supplied.length > 512) throw notFound();
      const guestValid = order.guestAccessTokenHash !== null
        && timingSafeStringEqual(hashGuestAccessToken(supplied), order.guestAccessTokenHash!);
      if (!guestValid && verifyLilyOrderAccessLink(supplied)?.orderId !== order.id) throw notFound();
    }

    if (order.customerCancellationStatus === "confirmed" || order.status === "cancelled") {
      return { status: order.status, refundStatus: order.refundStatus, cancellationStatus: "confirmed" };
    }
    const settings = await getLilyOperationalSettings();
    if (!settings.customerCancellationEnabled) {
      throw new ApiError(409, "O cancelamento pelo cliente está desativado.", { code: "LILY_CUSTOMER_CANCEL_DISABLED" });
    }
    const deadline = order.createdAt.getTime() + settings.customerCancellationWindowMinutes * 60_000;
    if (order.customerCancellationStatus !== "pending_confirmation" && Date.now() > deadline) {
      throw new ApiError(409, "O prazo para cancelar este pedido terminou.", { code: "LILY_CUSTOMER_CANCEL_WINDOW_CLOSED" });
    }
    if (!['awaiting_payment', 'paid'].includes(order.status)
      || order.operationStatus !== "received"
      || !["not_ready", "not_applicable"].includes(order.deliveryStatus)) {
      throw new ApiError(409, "O pedido já avançou na operação e não pode ser cancelado automaticamente.", { code: "LILY_CUSTOMER_CANCEL_STATE" });
    }

    const payment = order.payments.find((item) => ["pending", "approved", "partially_refunded"].includes(item.status));
    const isPaid = order.status === "paid";
    const provider = payment ? lilyPaymentProvider(payment.provider) : null;
    if (isPaid && (!payment || !provider?.refundPayment)) {
      throw new ApiError(409, "O pagamento deste pedido não permite estorno automático. A solicitação não foi concluída.", { code: "LILY_CUSTOMER_REFUND_UNAVAILABLE" });
    }

    if (order.customerCancellationStatus === "not_requested") {
      const reserved = await lilyPrisma.lilyOrder.updateMany({
        where: {
          id,
          customerCancellationStatus: "not_requested",
          status: { in: ["awaiting_payment", "paid"] },
          operationStatus: "received",
          deliveryStatus: { in: ["not_ready", "not_applicable"] }
        },
        data: { customerCancellationStatus: "pending_confirmation", customerCancellationRequestedAt: new Date() }
      });
      if (!reserved.count) {
        order = await lilyPrisma.lilyOrder.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: "desc" } } } });
        if (!order) throw notFound();
        if (order.customerCancellationStatus !== "pending_confirmation") {
          throw new ApiError(409, "O pedido mudou enquanto o cancelamento era solicitado.", { code: "LILY_CUSTOMER_CANCEL_STATE" });
        }
      }
    }

    let remoteRefund: LilyPaymentProviderRemoteState | null = null;
    let remoteCancel: LilyPaymentProviderRemoteState | null = null;
    if (isPaid && payment && provider?.refundPayment) {
      const remainingCents = payment.amountCents - payment.refundedCents;
      if (remainingCents > 0) {
        remoteRefund = await provider.refundPayment({
          providerPaymentId: payment.providerPaymentId,
          providerReference: payment.providerReference,
          amountCents: remainingCents,
          remainingCents,
          idempotencyKey: `cooklily-customer-cancel-${order.id}`
        });
        if (remoteRefund.status !== "refunded" || remoteRefund.refundedCents < payment.amountCents) {
          throw new ApiError(502, "O provedor ainda não confirmou o estorno. A solicitação ficará pendente para reconciliação.", { code: "LILY_CUSTOMER_REFUND_PENDING" });
        }
      }
    } else if (payment?.status === "pending" && provider?.cancelPayment && payment.providerPaymentId) {
      remoteCancel = await provider.cancelPayment(payment.providerPaymentId, `cooklily-customer-cancel-${order.id}`);
      if (remoteCancel.status !== "cancelled") {
        throw new ApiError(502, "O provedor ainda não confirmou o cancelamento da cobrança.", { code: "LILY_CUSTOMER_PAYMENT_CANCEL_PENDING" });
      }
    }

    const now = new Date();
    const finalOrder = await lilyPrisma.$transaction(async (tx) => {
      const current = await tx.lilyOrder.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: "desc" } } } });
      if (!current) throw notFound();
      if (current.customerCancellationStatus === "confirmed") return current;

      if (payment && remoteRefund) {
        const latestPayment = current.payments.find((item) => item.id === payment.id);
        if (!latestPayment) throw new ApiError(409, "O pagamento associado ao pedido mudou.", { code: "LILY_CUSTOMER_PAYMENT_CHANGED" });
        await tx.lilyPayment.update({ where: { id: payment.id }, data: {
          status: "refunded",
          providerPaymentId: remoteRefund.providerPaymentId ?? payment.providerPaymentId,
          providerReference: remoteRefund.operationReference ?? remoteRefund.providerReference ?? payment.providerReference,
          providerDataJson: JSON.stringify(remoteRefund.data),
          refundedCents: Math.max(latestPayment.refundedCents, remoteRefund.refundedCents),
          refundedAt: now
        } });
        await tx.lilyPaymentEvent.create({ data: {
          paymentId: payment.id,
          source: context ? `customer:${context.user.id}` : "customer:guest",
          eventType: "payment.refunded",
          fromStatus: latestPayment.status,
          toStatus: "refunded",
          payloadJson: JSON.stringify({ refundedCents: remoteRefund.refundedCents, providerStatus: remoteRefund.providerStatus })
        } });
        await tx.lilyPaymentReconciliation.create({ data: {
          paymentId: payment.id,
          expectedGrossCents: -latestPayment.amountCents,
          reportedGrossCents: -latestPayment.amountCents,
          feeCents: 0,
          netCents: -latestPayment.amountCents,
          discrepancyCents: 0,
          status: "matched",
          providerReference: remoteRefund.operationReference ?? remoteRefund.providerReference,
          note: "Estorno automático após cancelamento solicitado pelo cliente.",
          reconciledBy: context ? `customer:${context.user.id}` : "customer:guest"
        } });
      } else if (payment && remoteCancel) {
        await tx.lilyPayment.update({ where: { id: payment.id }, data: {
          status: "cancelled", cancelledAt: now,
          providerPaymentId: remoteCancel.providerPaymentId ?? payment.providerPaymentId,
          providerReference: remoteCancel.providerReference ?? payment.providerReference,
          providerDataJson: JSON.stringify(remoteCancel.data)
        } });
        await tx.lilyPaymentEvent.create({ data: {
          paymentId: payment.id,
          source: context ? `customer:${context.user.id}` : "customer:guest",
          eventType: "payment.cancelled",
          fromStatus: payment.status,
          toStatus: "cancelled",
          payloadJson: JSON.stringify({ providerStatus: remoteCancel.providerStatus })
        } });
      } else if (payment?.status === "pending") {
        await tx.lilyPayment.update({ where: { id: payment.id }, data: { status: "cancelled", cancelledAt: now } });
        await tx.lilyPaymentEvent.create({ data: {
          paymentId: payment.id,
          source: context ? `customer:${context.user.id}` : "customer:guest",
          eventType: "payment.cancelled",
          fromStatus: payment.status,
          toStatus: "cancelled"
        } });
      }

      await tx.lilyOrder.update({ where: { id }, data: {
        status: "cancelled",
        operationStatus: "cancelled",
        operationUpdatedAt: now,
        ...(current.fulfillmentType === "delivery" ? { deliveryStatus: "cancelled", deliveryUpdatedAt: now } : {}),
        customerCancellationStatus: "confirmed",
        refundStatus: remoteRefund ? "confirmed" : "not_required"
      } });
      await tx.lilyOrderStatusEvent.create({ data: { orderId: id, fromStatus: current.status, toStatus: "cancelled", actor: context ? `customer:${context.user.id}` : "customer:guest" } });
      if (current.operationStatus !== "cancelled") await tx.lilyOrderOperationEvent.create({ data: {
        orderId: id, fromStatus: current.operationStatus, toStatus: "cancelled", actor: context ? `customer:${context.user.id}` : "customer:guest", note: "Cancelamento solicitado pelo cliente dentro do prazo configurado."
      } });
      if (current.fulfillmentType === "delivery" && current.deliveryStatus !== "cancelled") await tx.lilyOrderDeliveryEvent.create({ data: {
        orderId: id, fromStatus: current.deliveryStatus, toStatus: "cancelled", actor: context ? `customer:${context.user.id}` : "customer:guest", note: "Cancelamento solicitado pelo cliente."
      } });
      if (remoteRefund && current.userId) await reversePaidOrderPoints(current.userId, current, tx);
      if (current.whatsappUpdatesOptIn) {
        await enqueueLilyWhatsAppStage(tx, { orderId: id, optedIn: true, stage: "cancelled", at: now });
        if (remoteRefund) await enqueueLilyWhatsAppStage(tx, { orderId: id, optedIn: true, stage: "refunded", at: now });
      }
      return tx.lilyOrder.findUniqueOrThrow({ where: { id } });
    });

    return { status: finalOrder.status, refundStatus: finalOrder.refundStatus, cancellationStatus: finalOrder.customerCancellationStatus };
  });

  app.post("/api/v1/lily/orders/:id/whatsapp/opt-out", {
    config: { rateLimit: { max: 12, timeWindow: "10 minutes" } }
  }, async (request) => {
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const order = await lilyPrisma.lilyOrder.findUnique({ where: { id } });
    if (!order) {
      throw new ApiError(404, "Pedido não encontrado.", { code: "LILY_ORDER_NOT_FOUND" });
    }

    if (order.userId) {
      const context = await requireLilySession(request);
      if (context.user.id !== order.userId) {
        throw new ApiError(404, "Pedido não encontrado.", { code: "LILY_ORDER_NOT_FOUND" });
      }
      requireLilyCsrf(request, context);
    } else {
      const supplied = request.headers["x-lily-order-token"];
      if (typeof supplied !== "string" || !order.guestAccessTokenHash) {
        throw new ApiError(404, "Pedido não encontrado.", { code: "LILY_ORDER_NOT_FOUND" });
      }
      const actualHash = hashGuestAccessToken(supplied);
      if (!timingSafeStringEqual(actualHash, order.guestAccessTokenHash)) {
        throw new ApiError(404, "Pedido não encontrado.", { code: "LILY_ORDER_NOT_FOUND" });
      }
    }

    if (!order.whatsappUpdatesOptIn) {
      return { enabled: false };
    }

    await lilyPrisma.$transaction([
      lilyPrisma.lilyOrder.update({
        where: { id },
        data: { whatsappUpdatesOptIn: false }
      }),
      lilyPrisma.lilyWhatsAppNotification.updateMany({
        where: {
          orderId: id,
          status: { in: ["pending", "failed"] }
        },
        data: {
          status: "skipped",
          lastErrorCode: "OPT_OUT",
          lastErrorMessage: "Cliente desativou atualizações operacionais deste pedido."
        }
      })
    ]);

    return { enabled: false };
  });

  app.get("/api/v1/lily/public/orders/:id/tracking", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const supplied = request.headers["x-lily-order-token"];

    // Resposta uniforme: não revelar se o ID existe, se pertence a conta ou se o token está ausente/incorreto.
    const notFound = () => {
      throw new ApiError(404, "Pedido não encontrado.", { code: "LILY_GUEST_ORDER_NOT_FOUND" });
    };

    if (typeof supplied !== "string" || supplied.length < 32 || supplied.length > 512) {
      return notFound();
    }

    const order = await findOrderById(id);
    if (!order) {
      return notFound();
    }

    const actualHash = hashGuestAccessToken(supplied);
    const guestValid = !order.userId && Boolean(order.guestAccessTokenHash)
      && timingSafeStringEqual(actualHash, order.guestAccessTokenHash!);
    const linkValid = verifyLilyOrderAccessLink(supplied)?.orderId === order.id;
    const customer = await getOptionalLilySession(request);
    const owner = Boolean(customer && customer.user.id === order.userId);
    if (!owner && !guestValid && !linkValid) {
      return notFound();
    }

    reply.header("Cache-Control", "private, no-store, max-age=0");
    reply.header("Pragma", "no-cache");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Robots-Tag", "noindex, nofollow");
    const settings = await getLilyOperationalSettings();
    return serializeGuestTrackingOrder(order, {
      enabled: settings.customerCancellationEnabled,
      windowMinutes: settings.customerCancellationWindowMinutes
    });
  });

  app.get("/api/v1/lily/public/orders/:id/edit-context", async (request) => {
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const order = await lilyPrisma.lilyOrder.findUnique({
      where: { id },
      include: { ...orderInclude, payments: { select: { status: true } } }
    });
    const supplied = request.headers["x-lily-order-token"];
    if (!order || typeof supplied !== "string") {
      throw new ApiError(404, "Pedido não encontrado ou sem acesso.", { code: "LILY_ORDER_NOT_FOUND" });
    }
    const guestValid = !order.userId && order.guestAccessTokenHash !== null
      && timingSafeStringEqual(hashGuestAccessToken(supplied), order.guestAccessTokenHash);
    const customer = await getOptionalLilySession(request);
    const owner = Boolean(customer && customer.user.id === order.userId);
    if (!owner && !guestValid && verifyLilyOrderAccessLink(supplied)?.orderId !== order.id) {
      throw new ApiError(404, "Pedido não encontrado ou sem acesso.", { code: "LILY_ORDER_NOT_FOUND" });
    }
    const settings = await getLilyOperationalSettings();
    const windowOpen = settings.customerCancellationEnabled
      && Date.now() <= order.createdAt.getTime() + settings.customerCancellationWindowMinutes * 60_000;
    const hasActivePayment = order.payments.some((payment) => ["pending", "approved", "partially_refunded"].includes(payment.status));
    if (!windowOpen || order.status !== "awaiting_payment" || order.operationStatus !== "received"
      || !["not_ready", "not_applicable"].includes(order.deliveryStatus) || hasActivePayment) {
      throw new ApiError(409, "Este pedido não pode mais ser editado. A janela de edição pode ter terminado ou o pagamento já foi iniciado.", {
        code: "LILY_ORDER_NOT_EDITABLE"
      });
    }
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        variantId: item.variantId,
        variantName: item.variantNameSnapshot,
        sizeMl: item.sizeMl,
        configurationHash: item.configurationHash,
        configuration: JSON.parse(item.configurationSnapshotJson),
        flavors: JSON.parse(item.flavorsSnapshotJson),
        allergens: JSON.parse(item.allergenSnapshotJson),
        unitPriceCents: item.unitPriceSnapshotCents,
        quantity: item.quantity,
        note: item.customerNote,
        addons: item.addons.map((addon) => ({
          addonId: addon.addonId, name: addon.addonNameSnapshot,
          unitPriceCents: addon.unitPriceSnapshotCents, quantity: addon.quantity
        }))
      }))
    };
  });

  app.get("/api/v1/lily/customer/orders", async (request) => {
    const context = await requireLilySession(request);
    const orders = await lilyPrisma.lilyOrder.findMany({
      where: { userId: context.user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return { orders: orders.map((order) => serializeOrder(order)) };
  });

  app.get("/api/v1/lily/customer/orders/:id", async (request) => {
    const context = await requireLilySession(request);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const order = await lilyPrisma.lilyOrder.findFirst({
      where: { id, userId: context.user.id },
      include: orderInclude
    });
    if (!order) throw new ApiError(404, "Pedido não encontrado.");
    return serializeOrder(order, null, true);
  });
}
