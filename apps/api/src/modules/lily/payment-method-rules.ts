import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";

export const lilyCheckoutPaymentMethods = ["pix", "credit_card", "debit_card"] as const;
export type LilyCheckoutPaymentMethod = typeof lilyCheckoutPaymentMethods[number];
export type LilyDiscountType = "none" | "percentage" | "fixed";

export type LilyPaymentMethodSetting = {
  method: LilyCheckoutPaymentMethod;
  enabled: boolean;
  discountType: LilyDiscountType;
  discountValue: number;
  maxDiscountCents: number | null;
  minimumOrderCents: number;
};

export type LilyPaymentQuote = {
  method: LilyCheckoutPaymentMethod;
  baseAmountCents: number;
  eligibleAmountCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  amountCents: number;
  rule: LilyPaymentMethodSetting;
};

const moneySchema = z.number().int().min(0).max(10_000_000);

export const paymentMethodSettingSchema = z.object({
  method: z.enum(lilyCheckoutPaymentMethods),
  enabled: z.boolean(),
  discountType: z.enum(["none", "percentage", "fixed"]),
  discountValue: z.number().int().min(0).max(1_000_000),
  maxDiscountCents: moneySchema.nullable(),
  minimumOrderCents: moneySchema
}).strict().superRefine((value, context) => {
  if (value.discountType === "percentage" && value.discountValue > 10_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "Desconto percentual não pode exceder 100%."
    });
  }
  if (value.discountType === "none" && value.discountValue !== 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "Desconto do tipo none deve possuir valor zero."
    });
  }
});

export const paymentMethodSettingsPatchSchema = z.object({
  methods: z.array(paymentMethodSettingSchema).min(1).max(3)
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  for (const row of value.methods) {
    if (ids.has(row.method)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["methods"],
        message: `Método duplicado: ${row.method}`
      });
    }
    ids.add(row.method);
  }
});

function normalizeRow(row: any): LilyPaymentMethodSetting {
  return {
    method: row.method as LilyCheckoutPaymentMethod,
    enabled: Boolean(row.enabled),
    discountType: row.discountType as LilyDiscountType,
    discountValue: Number(row.discountValue ?? 0),
    maxDiscountCents: row.maxDiscountCents == null ? null : Number(row.maxDiscountCents),
    minimumOrderCents: Number(row.minimumOrderCents ?? 0)
  };
}

export async function getLilyPaymentMethodSettings(): Promise<LilyPaymentMethodSetting[]> {
  const rows = await lilyPrisma.$queryRawUnsafe<any[]>(
    `SELECT "method", "enabled", "discountType", "discountValue", "maxDiscountCents", "minimumOrderCents"
       FROM "LilyPaymentMethodSetting"
      ORDER BY CASE "method" WHEN 'pix' THEN 1 WHEN 'credit_card' THEN 2 ELSE 3 END`
  );
  const mapped = new Map(rows.map((row) => [String(row.method), normalizeRow(row)]));
  return lilyCheckoutPaymentMethods.map((method) => mapped.get(method) ?? {
    method,
    enabled: false,
    discountType: "none",
    discountValue: 0,
    maxDiscountCents: null,
    minimumOrderCents: 0
  });
}

export async function getLilyPaymentMethodSetting(method: LilyCheckoutPaymentMethod) {
  const settings = await getLilyPaymentMethodSettings();
  return settings.find((row) => row.method === method)!;
}

export async function saveLilyPaymentMethodSettings(input: LilyPaymentMethodSetting[]) {
  for (const row of input) {
    await lilyPrisma.$executeRawUnsafe(
      `INSERT INTO "LilyPaymentMethodSetting"
        ("method", "enabled", "discountType", "discountValue", "maxDiscountCents", "minimumOrderCents", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT("method") DO UPDATE SET
         "enabled" = excluded."enabled",
         "discountType" = excluded."discountType",
         "discountValue" = excluded."discountValue",
         "maxDiscountCents" = excluded."maxDiscountCents",
         "minimumOrderCents" = excluded."minimumOrderCents",
         "updatedAt" = CURRENT_TIMESTAMP`,
      row.method,
      row.enabled ? 1 : 0,
      row.discountType,
      row.discountValue,
      row.maxDiscountCents,
      row.minimumOrderCents
    );
  }
  return getLilyPaymentMethodSettings();
}

export function calculateLilyPaymentQuote(input: {
  method: LilyCheckoutPaymentMethod;
  grandTotalCents: number;
  deliveryFeeCents: number;
  setting: LilyPaymentMethodSetting;
}): LilyPaymentQuote {
  const baseAmountCents = Math.max(0, Math.trunc(input.grandTotalCents));
  const deliveryFeeCents = Math.min(baseAmountCents, Math.max(0, Math.trunc(input.deliveryFeeCents)));
  const eligibleAmountCents = Math.max(0, baseAmountCents - deliveryFeeCents);
  let discountCents = 0;

  if (input.setting.enabled && eligibleAmountCents >= input.setting.minimumOrderCents) {
    if (input.setting.discountType === "percentage") {
      discountCents = Math.floor(eligibleAmountCents * input.setting.discountValue / 10_000);
    } else if (input.setting.discountType === "fixed") {
      discountCents = input.setting.discountValue;
    }
  }

  if (input.setting.maxDiscountCents != null) {
    discountCents = Math.min(discountCents, input.setting.maxDiscountCents);
  }
  discountCents = Math.min(eligibleAmountCents, Math.max(0, discountCents));

  return {
    method: input.method,
    baseAmountCents,
    eligibleAmountCents,
    deliveryFeeCents,
    discountCents,
    amountCents: baseAmountCents - discountCents,
    rule: { ...input.setting }
  };
}
