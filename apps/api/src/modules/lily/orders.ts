import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { lilyAttributionInputSchema, normalizeLilyAttribution } from "./attribution";
import { getOptionalLilySession, normalizeLilyPhone, requireLilyCsrf, requireLilySession } from "./auth";
import { lilyAddressInputSchema, normalizeLilyAddress } from "./addresses";
import { lilyConfigurationSchema, quoteLilyConfiguration } from "./configuration";
import { resolveLilyFulfillment } from "./fulfillment";

const quantitySchema = z.number().int().min(1).max(20);
const noteSchema = z.string().trim().max(300).nullable().optional();
const moneySchema = z.number().int().min(0).max(10_000_000);

const quoteItemSchema = lilyConfigurationSchema.extend({
  quantity: quantitySchema.default(1),
  note: noteSchema
}).strict();

const orderItemSchema = quoteItemSchema.extend({
  configurationHash: z.string().regex(/^[a-f0-9]{24}$/),
  expectedUnitPriceCents: moneySchema
}).strict();

const quoteSchema = z.object({
  fulfillmentType: z.enum(["pickup", "delivery"]),
  address: lilyAddressInputSchema.optional(),
  items: z.array(quoteItemSchema).min(1).max(30)
}).strict();

const orderSchema = z.object({
  phone: z.string().trim().min(8).max(40),
  fulfillmentType: z.enum(["pickup", "delivery"]),
  address: lilyAddressInputSchema.optional(),
  customerNote: z.string().trim().max(500).nullable().optional(),
  items: z.array(orderItemSchema).min(1).max(30),
  attribution: lilyAttributionInputSchema.optional()
}).strict();

type QuoteItemInput = z.infer<typeof quoteItemSchema>;
type OrderInput = z.infer<typeof orderSchema>;

async function quoteItems(items: QuoteItemInput[]) {
  const calculated: Array<Awaited<ReturnType<typeof quoteLilyConfiguration>> & {
    quantity: number;
    note: string | null;
    lineTotalCents: number;
  }> = [];
  for (const item of items) {
    const configuration = await quoteLilyConfiguration({
      productId: item.productId,
      sizeMl: item.sizeMl,
      flavorIds: item.flavorIds,
      addons: item.addons
    });
    calculated.push({
      ...configuration,
      quantity: item.quantity,
      note: item.note?.trim() || null,
      lineTotalCents: configuration.totalPriceCents * item.quantity
    });
  }
  return calculated;
}

async function calculateQuote(input: z.infer<typeof quoteSchema>) {
  const address = input.address ? normalizeLilyAddress(input.address) : undefined;
  const fulfillment = await resolveLilyFulfillment(input.fulfillmentType, address);
  const items = await quoteItems(input.items);
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  if (subtotalCents < fulfillment.minimumOrderCents) {
    throw new ApiError(400, "Pedido abaixo do mínimo configurado.", {
      code: "LILY_ORDER_MINIMUM",
      minimumOrderCents: fulfillment.minimumOrderCents,
      subtotalCents
    });
  }
  return {
    items,
    fulfillment,
    subtotalCents,
    deliveryFeeCents: fulfillment.deliveryFeeCents,
    discountTotalCents: 0,
    grandTotalCents: subtotalCents + fulfillment.deliveryFeeCents,
    address: address ?? null
  };
}

function fingerprint(input: {
  userId: string | null;
  phoneNormalized: string;
  order: OrderInput;
  address: ReturnType<typeof normalizeLilyAddress> | null;
}) {
  const canonical = {
    userId: input.userId,
    phoneNormalized: input.phoneNormalized,
    fulfillmentType: input.order.fulfillmentType,
    address: input.address,
    customerNote: input.order.customerNote?.trim() || null,
    items: input.order.items.map((item) => ({
      productId: item.productId,
      sizeMl: item.sizeMl,
      flavorIds: [...item.flavorIds].sort(),
      addons: [...item.addons].sort((a, b) => a.addonId.localeCompare(b.addonId)),
      quantity: item.quantity,
      note: item.note?.trim() || null,
      configurationHash: item.configurationHash,
      expectedUnitPriceCents: item.expectedUnitPriceCents
    })),
    attribution: normalizeLilyAttribution(input.order.attribution ?? {})
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function orderNumber() {
  return `CL-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

const orderInclude = {
  items: { include: { addons: true } },
  statusEvents: { orderBy: { createdAt: "asc" as const } }
};

async function findOrderById(id: string) {
  return lilyPrisma.lilyOrder.findUnique({ where: { id }, include: orderInclude });
}

function serializeOrder(order: Awaited<ReturnType<typeof findOrderById>>) {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    discountTotalCents: order.discountTotalCents,
    grandTotalCents: order.grandTotalCents,
    address: order.addressSnapshotJson ? JSON.parse(order.addressSnapshotJson) : null,
    customerNote: order.customerNote,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      sizeMl: item.sizeMl,
      configurationHash: item.configurationHash,
      flavors: JSON.parse(item.flavorsSnapshotJson),
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
    }))
  };
}

function readIdempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[A-Za-z0-9._:-]{16,120}$/.test(value)) {
    throw new ApiError(400, "Idempotency-Key inválido ou ausente.", { code: "LILY_IDEMPOTENCY_KEY_REQUIRED" });
  }
  return value;
}

export async function lilyOrderRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/orders/quote", {
    config: { rateLimit: { max: 40, timeWindow: "1 minute" } }
  }, async (request) => calculateQuote(quoteSchema.parse(request.body)));

  app.post("/api/v1/lily/orders", {
    config: { rateLimit: { max: 8, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = orderSchema.parse(request.body);
    const idempotencyKey = readIdempotencyKey(request);
    const context = await getOptionalLilySession(request);
    if (context) requireLilyCsrf(request, context);

    const phoneNormalized = normalizeLilyPhone(input.phone);
    if (!phoneNormalized) throw new ApiError(400, "Telefone inválido.", { code: "LILY_INVALID_PHONE" });
    const address = input.address ? normalizeLilyAddress(input.address) : null;
    const requestFingerprint = fingerprint({
      userId: context?.user.id ?? null,
      phoneNormalized,
      order: input,
      address
    });

    const existing = await lilyPrisma.lilyOrder.findUnique({ where: { idempotencyKey }, include: orderInclude });
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ApiError(409, "Idempotency-Key já foi usado com outro pedido.", { code: "LILY_IDEMPOTENCY_CONFLICT" });
      }
      return reply.code(200).send(serializeOrder(existing));
    }

    const quote = await calculateQuote({
      fulfillmentType: input.fulfillmentType,
      address: input.address,
      items: input.items.map(({ configurationHash: _hash, expectedUnitPriceCents: _price, ...item }) => item)
    });
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
    let created;
    try {
      created = await lilyPrisma.lilyOrder.create({
        data: {
          orderNumber: orderNumber(),
          idempotencyKey,
          requestFingerprint,
          userId: context?.user.id ?? null,
          phoneNormalized,
          fulfillmentType: input.fulfillmentType,
          status: "awaiting_payment",
          subtotalCents: quote.subtotalCents,
          deliveryFeeCents: quote.deliveryFeeCents,
          discountTotalCents: 0,
          grandTotalCents: quote.grandTotalCents,
          addressSnapshotJson: quote.address ? JSON.stringify(quote.address) : null,
          customerNote: input.customerNote?.trim() || null,
          laQr: attribution.laQr,
          laCampaign: attribution.laCampaign,
          laVariant: attribution.laVariant,
          items: {
            create: quote.items.map((item) => ({
              productId: item.product.id,
              variantId: item.variant.id,
              productNameSnapshot: item.product.name,
              variantNameSnapshot: item.variant.name,
              sizeMl: item.sizeMl,
              configurationHash: item.configurationHash,
              configurationSnapshotJson: JSON.stringify({
                productId: item.product.id,
                sizeMl: item.sizeMl,
                flavorIds: item.flavors.map((flavor) => flavor.id),
                addons: item.addons.map((addon) => ({ addonId: addon.addonId, quantity: addon.quantity }))
              }),
              flavorsSnapshotJson: JSON.stringify(item.flavors),
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
            }))
          },
          statusEvents: {
            create: {
              fromStatus: null,
              toStatus: "awaiting_payment",
              actor: context ? `customer:${context.user.id}` : "guest"
            }
          }
        },
        include: orderInclude
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        const raced = await lilyPrisma.lilyOrder.findUnique({ where: { idempotencyKey }, include: orderInclude });
        if (raced?.requestFingerprint === requestFingerprint) {
          return reply.code(200).send(serializeOrder(raced));
        }
      }
      throw error;
    }
    return reply.code(201).send(serializeOrder(created));
  });

  app.get("/api/v1/lily/customer/orders", async (request) => {
    const context = await requireLilySession(request);
    const orders = await lilyPrisma.lilyOrder.findMany({
      where: { userId: context.user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return { orders: orders.map(serializeOrder) };
  });

  app.get("/api/v1/lily/customer/orders/:id", async (request) => {
    const context = await requireLilySession(request);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const order = await lilyPrisma.lilyOrder.findFirst({
      where: { id, userId: context.user.id },
      include: orderInclude
    });
    if (!order) throw new ApiError(404, "Pedido não encontrado.");
    return serializeOrder(order);
  });
}
