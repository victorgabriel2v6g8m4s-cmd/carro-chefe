import type { TemplateCategory } from "./template-types";

export type PricingConfig = { usdToBrl: number; usd: Record<TemplateCategory | "service", number>; freeServiceMessages: number; effectiveDate: string; source: string };
export const defaultPricing: PricingConfig = { usdToBrl: 5.3719, usd: { marketing: 0.0625, utility: 0.0068, authentication: 0.0068, service: 0.0068 }, freeServiceMessages: 1000, effectiveDate: "2026-10-01", source: "Meta rate card Brasil: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing#rate-cards · USD/BRL em 29/10/2026: Investing.com. Confira valores e moeda da WABA." };

export function quoteMessages(outbound: Array<{ category: string; windowOpen: boolean }>, config: PricingConfig) {
  let freeServiceUsed = 0;
  let blockedService = 0;
  let usd = 0;
  const byCategory = Object.fromEntries(["marketing", "utility", "authentication", "service"].map((category) => [category, { count: 0, free: 0, blocked: 0, usd: 0 }])) as Record<keyof PricingConfig["usd"], { count: number; free: number; blocked: number; usd: number }>;
  for (const message of outbound) {
    const category = message.category === "utility" || message.category === "authentication" || message.category === "service" ? message.category : "marketing";
    const detail = byCategory[category];
    detail.count += 1;
    if (category === "service" && !message.windowOpen) { blockedService += 1; detail.blocked += 1; continue; }
    if (category === "service" && freeServiceUsed < config.freeServiceMessages) { freeServiceUsed += 1; detail.free += 1; continue; }
    detail.usd += config.usd[category];
    usd += config.usd[category];
  }
  return { usd, brl: usd * config.usdToBrl, freeServiceUsed, blockedService, byCategory };
}
