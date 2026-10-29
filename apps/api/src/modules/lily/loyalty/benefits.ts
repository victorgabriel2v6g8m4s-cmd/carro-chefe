import { z } from "zod";

export const loyaltyBenefitConfigurationSchema = z.object({
  variantIds: z.array(z.string().min(1).max(80)).max(20).default([]),
  flavorIds: z.array(z.string().min(1).max(80)).max(40).default([]),
  addonIds: z.array(z.string().min(1).max(80)).max(40).default([]),
  comboItems: z.array(z.object({
    comboItemId: z.string().min(1).max(80),
    variantIds: z.array(z.string().min(1).max(80)).max(20),
    flavorIds: z.array(z.string().min(1).max(80)).max(40),
    addonIds: z.array(z.string().min(1).max(80)).max(40)
  }).strict()).max(40).optional()
}).strict();

export const loyaltyBenefitSchema = z.object({
  id: z.string().trim().min(1).max(100),
  kind: z.enum(["product", "coupon", "discount", "offer", "combo", "user_class", "note"]),
  entityId: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(180),
  categoryId: z.string().trim().max(100).nullable().default(null),
  maxRedemptionsPerUser: z.number().int().min(1).max(100).default(1),
  selectionMode: z.enum(["customer_choice", "preset"]).default("customer_choice"),
  configuration: loyaltyBenefitConfigurationSchema.default({ variantIds: [], flavorIds: [], addonIds: [] })
}).strict();

export type LoyaltyBenefit = z.infer<typeof loyaltyBenefitSchema>;

export function parseLoyaltyBenefits(input: string): LoyaltyBenefit[] {
  try {
    const value: unknown = JSON.parse(input);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => {
      if (typeof item === "string" && item.trim()) return [{
        id: `legacy-${index}`,
        kind: "note" as const,
        entityId: `legacy-${index}`,
        label: item.trim(),
        categoryId: null,
        maxRedemptionsPerUser: 1,
        selectionMode: "customer_choice" as const,
        configuration: { variantIds: [], flavorIds: [], addonIds: [] }
      }];
      const parsed = loyaltyBenefitSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}