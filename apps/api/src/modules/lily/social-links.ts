import { z } from "zod";

export const socialPlatforms = ["instagram", "facebook", "whatsapp", "tiktok", "google"] as const;
export type SocialPlatform = typeof socialPlatforms[number];

const allowedHosts: Record<SocialPlatform, string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  whatsapp: ["wa.me", "whatsapp.com"],
  tiktok: ["tiktok.com"],
  google: ["google.com", "g.page", "maps.app.goo.gl", "goo.gl"]
};

export const socialLinksSchema = z.array(z.object({
  platform: z.enum(socialPlatforms),
  label: z.string().trim().max(60).default(""),
  identifier: z.string().trim().max(120).default(""),
  url: z.string().trim().url().max(500)
}).strict()).max(5).superRefine((links, context) => {
  const seen = new Set<SocialPlatform>();
  links.forEach((link, index) => {
    if (seen.has(link.platform)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "platform"], message: "Cada rede social pode ser configurada apenas uma vez." });
    seen.add(link.platform);
    try { normalizeSocialUrl(link.platform, link.url); }
    catch (error) { context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "url"], message: error instanceof Error ? error.message : "Link inválido." }); }
  });
});

export type SocialLink = z.infer<typeof socialLinksSchema>[number];

export function normalizeSocialUrl(platform: SocialPlatform, value: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("Informe um link completo HTTPS da rede social."); }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const allowed = allowedHosts[platform].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (parsed.protocol !== "https:" || !allowed || parsed.username || parsed.password) {
    throw new Error(`O link não corresponde à rede ${platform} ou não usa HTTPS.`);
  }
  parsed.hash = "";
  return parsed.toString();
}

export function parseSocialLinks(value: string): SocialLink[] {
  try {
    const result = socialLinksSchema.safeParse(JSON.parse(value));
    return result.success ? result.data.map((link) => ({ ...link, url: normalizeSocialUrl(link.platform, link.url) })) : [];
  } catch {
    return [];
  }
}
