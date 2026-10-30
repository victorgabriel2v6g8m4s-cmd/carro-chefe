export type AdminProductSummary = {
  id: string;
  slug: string;
  displayName: string;
  descriptiveName: string | null;
  description: string | null;
  status: string;
  isAvailable: boolean;
  isPurchasable: boolean;
  sortOrder: number;
  category: { id: string; name: string };
  cover: { id: string; url: string; altText: string } | null;
  variants: Array<{ id: string; name: string; sizeMl: number; priceCents: number; compareAtPriceCents: number | null; isAvailable: boolean }>;
};
