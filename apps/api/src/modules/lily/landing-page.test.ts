import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { defaultLilyLandingPageConfig, lilyLandingPageConfigSchema } from "@carro-chefe/contracts";

const appPromise = buildApp();

afterAll(async () => { await (await appPromise).close(); });

describe("landing page CookLily", () => {
  it("valida defaults de marca e estrutura do destaque", () => {
    expect(lilyLandingPageConfigSchema.parse(defaultLilyLandingPageConfig)).toEqual(defaultLilyLandingPageConfig);
    expect(defaultLilyLandingPageConfig.showcase.mode).toBe("weekly");
    expect(defaultLilyLandingPageConfig.sections).toMatchObject({ rankingEnabled: true, reelsEnabled: true, locationEnabled: true });
  });

  it("serve a configuração pública sem revelar IDs de mídia e mantém ações em whitelist", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/landing" });
    const publicConfig = await app.inject({ method: "GET", url: "/api/v1/lily/public/config" });
    expect(response.statusCode).toBe(200);
    expect(publicConfig.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      version: 1,
      brand: { tagline: expect.any(String), description: expect.any(String) },
      showcase: { mode: "weekly" },
      sections: { rankingEnabled: true }
    });
    expect(response.json().banner.desktopMediaId).toBeUndefined();
    expect(response.json().banner.mobileMediaId).toBeUndefined();
    expect(response.json().banner.productTarget).toBeNull();
    expect(response.json().address).toBe(publicConfig.json().store.address);
  });

  it("exige staff para editar configurações e consultar opções", async () => {
    const app = await appPromise;
    const options = await app.inject({ method: "GET", url: "/api/v1/lily/admin/landing/options?kind=product" });
    const save = await app.inject({ method: "PUT", url: "/api/v1/lily/admin/landing", payload: defaultLilyLandingPageConfig });
    expect([401, 403]).toContain(options.statusCode);
    expect([401, 403]).toContain(save.statusCode);
  });
});
