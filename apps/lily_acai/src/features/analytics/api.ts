import { parseResponse } from "../../api";

export type LilyAnalyticsSummary = {
  generatedAt: string;
  window: { from: string; to: string; days: number };
  filters: { campaign: string | null; includeHomologation: boolean };
  events: Record<string, number>;
  funnel: Array<{ event: string; sessions: number }>;
  attribution: Array<{
    campaign: string | null;
    qr: string | null;
    variant: string | null;
    events: number;
  }>;
  orderAttribution: Array<{
    campaign: string | null;
    qr: string | null;
    variant: string | null;
    created: number;
    paid: number;
    grossOrderValueCents: number;
    paidGrossCents: number;
  }>;
  products: Array<{
    productSlug: string;
    views: number;
    addToCart: number;
  }>;
  orders: {
    created: number;
    grossOrderValueCents: number;
    paid: number;
    paidGrossCents: number;
  };
};

export async function getLilyAnalyticsSummary(input: {
  days?: number;
  campaign?: string;
  includeHomologation?: boolean;
} = {}) {
  const params = new URLSearchParams();
  if (input.days) params.set("days", String(input.days));
  if (input.campaign?.trim()) params.set("campaign", input.campaign.trim());
  if (input.includeHomologation) params.set("includeHomologation", "true");
  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/lily/admin/analytics/summary${query}`, {
    credentials: "same-origin",
    cache: "no-store"
  });
  return parseResponse<LilyAnalyticsSummary>(response);
}
