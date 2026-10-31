import { z } from "zod";

export const lilyLandingPageIds = ["cardapio", "ranking", "reels", "dashboard", "niveis", "pesquisas"] as const;
export const lilyLandingSocialIds = ["instagram", "facebook", "whatsapp", "tiktok", "google"] as const;

const cropSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(2.5)
}).strict();

const bannerActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("product"), targetId: z.string().min(1).max(120) }).strict(),
  z.object({ kind: z.literal("social"), targetId: z.enum(lilyLandingSocialIds) }).strict(),
  z.object({ kind: z.literal("page"), targetId: z.enum(lilyLandingPageIds) }).strict()
]);

export const lilyLandingPageConfigSchema = z.object({
  version: z.literal(1),
  banner: z.object({
    sameImage: z.boolean(),
    desktopMediaId: z.string().min(1).max(120).nullable(),
    mobileMediaId: z.string().min(1).max(120).nullable(),
    altText: z.string().trim().max(240),
    desktopCrop: cropSchema,
    mobileCrop: cropSchema,
    action: bannerActionSchema
  }).strict(),
  brand: z.object({ tagline: z.string().trim().max(160), description: z.string().trim().max(3000) }).strict(),
  showcase: z.object({
    mode: z.enum(["weekly", "carousel"]),
    productIds: z.array(z.string().min(1).max(120)).max(30),
    desktopColumns: z.number().int().min(1).max(4),
    mobileColumns: z.number().int().min(1).max(2),
    elements: z.object({ title: z.boolean(), description: z.boolean(), price: z.boolean(), badges: z.boolean(), action: z.boolean() }).strict()
  }).strict(),
  sections: z.object({ rankingEnabled: z.boolean(), reelsEnabled: z.boolean(), reelsTitle: z.string().trim().min(1).max(100), locationEnabled: z.boolean() }).strict()
}).strict();

export type LilyLandingPageConfig = z.infer<typeof lilyLandingPageConfigSchema>;
export type LilyLandingPageId = typeof lilyLandingPageIds[number];
export type LilyLandingSocialId = typeof lilyLandingSocialIds[number];

export const defaultLilyLandingPageConfig: LilyLandingPageConfig = {
  version: 1,
  banner: { sameImage: true, desktopMediaId: null, mobileMediaId: null, altText: "", desktopCrop: { x: 50, y: 50, zoom: 1 }, mobileCrop: { x: 50, y: 50, zoom: 1 }, action: { kind: "none" } },
  brand: {
    tagline: "Cremosidade, sabor e qualidade em cada garrafa.",
    description: "A CookLily reúne açaí, LilyShakes e doces em um cardápio feito para você escolher seus favoritos, conferir a disponibilidade e acompanhar seu pedido pelo site."
  },
  showcase: { mode: "weekly", productIds: [], desktopColumns: 3, mobileColumns: 1, elements: { title: true, description: true, price: true, badges: true, action: true } },
  sections: { rankingEnabled: true, reelsEnabled: true, reelsTitle: "Confira nossa experiência", locationEnabled: true }
};
