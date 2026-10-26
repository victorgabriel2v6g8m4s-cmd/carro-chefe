import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { normalizeLilyPhone } from "./auth";

export const lilyCouponTypes = ["percentage", "fixed", "free_shipping"] as const;
export const lilyCouponRecurrences = ["none", "daily", "weekly", "monthly"] as const;

export const couponCodeListSchema = z.array(z.string().trim().min(2).max(32).transform((code) => code.toUpperCase()))
  .max(5).default([]).superRefine((codes, context) => {
    if (new Set(codes).size !== codes.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Remova códigos de cupom duplicados." });
  });

const couponInclude = {
  categories: { select: { categoryId: true } },
  products: { select: { productId: true } }
} as const;

type QuotedItem = {
  kind: "product" | "combo";
  lineTotalCents: number;
  product?: { id: string };
  selections?: Array<{ product: { id: string }; totalPriceCents: number }>;
};

export type LilyCouponApplication = {
  couponId: string;
  code: string;
  title: string;
  discountCents: number;
  productDiscountCents: number;
  shippingDiscountCents: number;
  periodKey: string;
};

export type LilyCouponQuote = {
  discountCents: number;
  productDiscountCents: number;
  shippingDiscountCents: number;
  applications: LilyCouponApplication[];
  notices: Array<{ code: string; title: string; applied: boolean; discountCents: number; message: string | null }>;
};

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function couponRecurrencePeriodKey(date: Date, recurrence: string, timeZone: string) {
  const parts = localDateParts(date, timeZone);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (recurrence === "daily") return `day:${dateKey}`;
  if (recurrence === "monthly") return `month:${parts.year}-${parts.month}`;
  if (recurrence === "weekly") {
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - dayOfWeek + 1);
    return `week:${utcDate.toISOString().slice(0, 10)}`;
  }
  return "all";
}

function couponIsWithinValidity(coupon: { status: string; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  return coupon.status === "active"
    && (!coupon.startsAt || coupon.startsAt <= now)
    && (!coupon.endsAt || coupon.endsAt >= now);
}

async function ensureCustomerLimit(input: {
  coupon: { id: string; recurrence: string; maxUsesPerCustomer: number };
  periodKey: string;
  phoneNormalized?: string | null;
}) {
  if (!input.phoneNormalized) return;
  const redemptions = await lilyPrisma.lilyCouponRedemption.findMany({
    where: { couponId: input.coupon.id, periodKey: input.periodKey },
    select: { order: { select: { phoneNormalized: true } } }
  });
  const used = redemptions.filter((entry) => entry.order.phoneNormalized === input.phoneNormalized).length;
  if (used >= input.coupon.maxUsesPerCustomer) {
    throw new ApiError(409, "Este cupom já atingiu seu limite de uso para você neste período.", { code: "LILY_COUPON_CUSTOMER_LIMIT" });
  }
}

function matchingProductIds(item: QuotedItem) {
  if (item.kind === "product") return item.product ? [item.product.id] : [];
  return item.selections?.map((selection) => selection.product.id) ?? [];
}

function splitDiscount(discountCents: number, productBaseCents: number, shippingBaseCents: number, shippingEligible: boolean) {
  const eligibleShipping = shippingEligible ? shippingBaseCents : 0;
  const totalEligible = productBaseCents + eligibleShipping;
  const capped = Math.min(totalEligible, Math.max(0, discountCents));
  const shippingDiscountCents = eligibleShipping === 0
    ? 0
    : Math.min(eligibleShipping, Math.floor(capped * eligibleShipping / Math.max(1, totalEligible)));
  return {
    productDiscountCents: Math.min(productBaseCents, capped - shippingDiscountCents),
    shippingDiscountCents
  };
}

export async function calculateLilyCouponQuote(input: {
  codes: string[];
  items: QuotedItem[];
  subtotalCents: number;
  shippingCents: number;
  fulfillmentType: "pickup" | "delivery";
  phone?: string;
  now?: Date;
}): Promise<LilyCouponQuote> {
  if (input.codes.length === 0) return { discountCents: 0, productDiscountCents: 0, shippingDiscountCents: 0, applications: [], notices: [] };
  const normalizedPhone = input.phone ? normalizeLilyPhone(input.phone) : null;
  if (input.phone && !normalizedPhone) throw new ApiError(400, "Telefone inválido para validar o cupom.", { code: "LILY_COUPON_PHONE_INVALID" });

  const [coupons, operationalSettings] = await Promise.all([
    lilyPrisma.lilyCoupon.findMany({ where: { code: { in: input.codes } }, include: couponInclude }),
    lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { timezone: true } })
  ]);
  const byCode = new Map(coupons.map((coupon) => [coupon.code, coupon]));
  const now = input.now ?? new Date();
  const timeZone = operationalSettings?.timezone || "America/Campo_Grande";
  const candidateProductIds = [...new Set(input.items.flatMap(matchingProductIds))];
  const productCategories = await lilyPrisma.lilyProduct.findMany({
    where: { id: { in: candidateProductIds } },
    select: { id: true, categoryId: true }
  });
  const categoryByProduct = new Map(productCategories.map((product) => [product.id, product.categoryId]));

  const calculated = [] as Array<{ coupon: (typeof coupons)[number]; application: LilyCouponApplication; productDiscountCents: number; shippingDiscountCents: number; eligibleItems: number[]; eligibleShippingCents: number }>;
  for (const code of input.codes) {
    const coupon = byCode.get(code);
    if (!coupon || !couponIsWithinValidity(coupon, now)) {
      throw new ApiError(400, "Cupom inválido, pausado ou fora do prazo de validade.", { code: "LILY_COUPON_UNAVAILABLE" });
    }
    if (coupon.maxUsesTotal != null && coupon.usesCount >= coupon.maxUsesTotal) {
      throw new ApiError(409, "Este cupom atingiu o limite total de utilizações.", { code: "LILY_COUPON_TOTAL_LIMIT" });
    }
    if (input.subtotalCents < coupon.minimumOrderCents) {
      throw new ApiError(400, `Este cupom exige subtotal mínimo de R$ ${(coupon.minimumOrderCents / 100).toFixed(2).replace(".", ",")}.`, { code: "LILY_COUPON_MINIMUM" });
    }
    const categoryIds = new Set(coupon.categories.map((scope) => scope.categoryId));
    const productIds = new Set(coupon.products.map((scope) => scope.productId));
    const hasProductScope = categoryIds.size > 0 || productIds.size > 0;
    const eligibleItems = input.items.map((item) => {
      const ids = matchingProductIds(item);
      const applies = ids.some((id) => productIds.has(id) || categoryIds.has(categoryByProduct.get(id) ?? ""));
      if (!applies) return 0;
      if (item.kind === "product") return item.lineTotalCents;
      const selections = item.selections ?? [];
      const allPrice = selections.reduce((sum, selection) => sum + selection.totalPriceCents, 0);
      const eligiblePrice = selections.filter((selection) => productIds.has(selection.product.id) || categoryIds.has(categoryByProduct.get(selection.product.id) ?? ""))
        .reduce((sum, selection) => sum + selection.totalPriceCents, 0);
      return allPrice > 0 ? Math.floor(item.lineTotalCents * eligiblePrice / allPrice) : 0;
    });
    const eligibleProductCents = eligibleItems.reduce((sum, value) => sum + value, 0);
    const shippingEligible = coupon.appliesToShipping && input.fulfillmentType === "delivery";
    const eligibleShippingCents = shippingEligible ? input.shippingCents : 0;
    if (eligibleProductCents === 0 && eligibleShippingCents === 0) {
      throw new ApiError(400, "Este cupom não se aplica aos itens ou à entrega deste pedido.", { code: "LILY_COUPON_NOT_APPLICABLE" });
    }
    if (coupon.type === "free_shipping" && !shippingEligible) {
      throw new ApiError(400, "Este cupom é válido somente para pedidos com entrega.", { code: "LILY_COUPON_SHIPPING_ONLY" });
    }
    if (!hasProductScope && !coupon.appliesToShipping) {
      throw new ApiError(400, "Este cupom ainda não possui itens aplicáveis configurados.", { code: "LILY_COUPON_SCOPE_EMPTY" });
    }

    const periodKey = couponRecurrencePeriodKey(now, coupon.recurrence, timeZone);
    await ensureCustomerLimit({ coupon, periodKey, phoneNormalized: normalizedPhone });
    const eligibleCents = eligibleProductCents + eligibleShippingCents;
    let discountCents = coupon.type === "percentage"
      ? Math.floor(eligibleCents * coupon.value / 10_000)
      : coupon.type === "free_shipping" ? eligibleShippingCents : coupon.value;
    if (coupon.maxDiscountCents != null) discountCents = Math.min(discountCents, coupon.maxDiscountCents);
    discountCents = Math.min(eligibleCents, Math.max(0, discountCents));
    const split = splitDiscount(discountCents, eligibleProductCents, eligibleShippingCents, shippingEligible);
    calculated.push({
      coupon,
      application: {
        couponId: coupon.id,
        code: coupon.code,
        title: coupon.title,
        discountCents: split.productDiscountCents + split.shippingDiscountCents,
        ...split,
        periodKey
      },
      ...split,
      eligibleItems,
      eligibleShippingCents
    });
  }

  if (calculated.length > 1 && calculated.some(({ coupon }) => !coupon.allowCombination)) {
    throw new ApiError(400, "Um ou mais cupons não podem ser combinados com outros cupons.", { code: "LILY_COUPON_COMBINATION_BLOCKED" });
  }
  const additive = calculated.length > 1 && calculated.every(({ coupon }) => coupon.isAdditive);
  let chosen = additive ? calculated : [calculated.reduce((best, candidate) => candidate.application.discountCents > best.application.discountCents ? candidate : best)];
  if (additive) {
    const remainingItems = input.items.map((item) => item.lineTotalCents);
    let remainingShipping = input.shippingCents;
    chosen = calculated.map((candidate) => {
      const eligibleProductCents = candidate.eligibleItems.reduce((sum, value, index) => sum + Math.min(value, remainingItems[index] ?? 0), 0);
      const eligibleShippingCents = Math.min(candidate.eligibleShippingCents, remainingShipping);
      const eligibleCents = eligibleProductCents + eligibleShippingCents;
      let discountCents = candidate.coupon.type === "percentage"
        ? Math.floor(eligibleCents * candidate.coupon.value / 10_000)
        : candidate.coupon.type === "free_shipping" ? eligibleShippingCents : candidate.coupon.value;
      if (candidate.coupon.maxDiscountCents != null) discountCents = Math.min(discountCents, candidate.coupon.maxDiscountCents);
      discountCents = Math.min(eligibleCents, Math.max(0, discountCents));
      const split = splitDiscount(discountCents, eligibleProductCents, eligibleShippingCents, eligibleShippingCents > 0);
      let productToConsume = split.productDiscountCents;
      for (let index = 0; index < remainingItems.length && productToConsume > 0; index += 1) {
        const eligible = Math.min(candidate.eligibleItems[index] ?? 0, remainingItems[index] ?? 0);
        const consumed = Math.min(eligible, productToConsume);
        remainingItems[index] = Math.max(0, (remainingItems[index] ?? 0) - consumed);
        productToConsume -= consumed;
      }
      remainingShipping = Math.max(0, remainingShipping - split.shippingDiscountCents);
      const application = { ...candidate.application, productDiscountCents: split.productDiscountCents, shippingDiscountCents: split.shippingDiscountCents, discountCents: split.productDiscountCents + split.shippingDiscountCents };
      return { ...candidate, application, productDiscountCents: split.productDiscountCents, shippingDiscountCents: split.shippingDiscountCents };
    });
  }
  const applied = new Map(chosen.map(({ coupon, application }) => [coupon.id, application]));
  const notices = calculated.map(({ coupon, application }) => ({
    code: coupon.code,
    title: coupon.title,
    applied: applied.has(coupon.id),
    discountCents: applied.get(coupon.id)?.discountCents ?? 0,
    message: applied.has(coupon.id) ? null : "Outro cupom selecionado oferece desconto maior; este não foi combinado."
  }));
  const applications = chosen.map(({ application }) => application);
  const discountCents = applications.reduce((sum, application) => sum + application.discountCents, 0);
  const productDiscountCents = applications.reduce((sum, application) => sum + application.productDiscountCents, 0);
  const shippingDiscountCents = applications.reduce((sum, application) => sum + application.shippingDiscountCents, 0);
  return { discountCents, productDiscountCents, shippingDiscountCents, applications, notices };
}

export async function reserveLilyCouponRedemptions(input: {
  tx: any;
  applications: LilyCouponApplication[];
  orderId: string;
  phoneNormalized: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  for (const application of input.applications) {
    const coupon = await input.tx.lilyCoupon.findUnique({ where: { id: application.couponId } });
    if (!coupon || !couponIsWithinValidity(coupon, now)) {
      throw new ApiError(409, "O cupom deixou de estar disponível. Recalcule o pedido.", { code: "LILY_COUPON_CHANGED" });
    }
    const existingUsage = await input.tx.lilyCouponRedemption.findMany({
      where: { couponId: coupon.id, periodKey: application.periodKey },
      select: { order: { select: { phoneNormalized: true } } }
    });
    if (existingUsage.filter((entry: { order: { phoneNormalized: string } }) => entry.order.phoneNormalized === input.phoneNormalized).length >= coupon.maxUsesPerCustomer) {
      throw new ApiError(409, "Este cupom já atingiu seu limite de uso para você neste período.", { code: "LILY_COUPON_CUSTOMER_LIMIT" });
    }
    const reserved = await input.tx.lilyCoupon.updateMany({
      where: {
        id: coupon.id,
        status: "active",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        ...(coupon.maxUsesTotal == null ? {} : { usesCount: { lt: coupon.maxUsesTotal } })
      },
      data: { usesCount: { increment: 1 } }
    });
    if (reserved.count !== 1) throw new ApiError(409, "Este cupom atingiu o limite total de utilizações.", { code: "LILY_COUPON_TOTAL_LIMIT" });
    await input.tx.lilyCouponRedemption.create({
      data: { couponId: coupon.id, orderId: input.orderId, periodKey: application.periodKey, discountCents: application.discountCents, codeSnapshot: application.code, titleSnapshot: application.title }
    });
  }
}
