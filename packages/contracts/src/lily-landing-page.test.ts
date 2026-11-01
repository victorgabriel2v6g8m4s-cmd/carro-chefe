import { describe, expect, it } from "vitest";
import { defaultLilyLandingPageConfig, lilyLandingPageConfigSchema } from "./lily-landing-page";

describe("configuração do carrossel da landing", () => {
  it("fornece tempo padrão para configurações já salvas sem o campo", () => {
    const { intervalSeconds: _oldField, ...oldShowcase } = defaultLilyLandingPageConfig.showcase;
    const parsed = lilyLandingPageConfigSchema.parse({ ...defaultLilyLandingPageConfig, showcase: oldShowcase });
    expect(parsed.showcase.intervalSeconds).toBe(7);
  });

  it("aceita intervalo configurável entre 3 e 20 segundos", () => {
    const parsed = lilyLandingPageConfigSchema.parse({ ...defaultLilyLandingPageConfig, showcase: { ...defaultLilyLandingPageConfig.showcase, intervalSeconds: 12 } });
    expect(parsed.showcase.intervalSeconds).toBe(12);
    expect(lilyLandingPageConfigSchema.safeParse({ ...defaultLilyLandingPageConfig, showcase: { ...defaultLilyLandingPageConfig.showcase, intervalSeconds: 2 } }).success).toBe(false);
  });
});
