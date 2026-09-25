import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(role: "customer" | "staff" = "customer") {
  const phone = role === "staff" ? "67999990001" : "67999990002";
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: "senha-cooklily-catalogo-2026",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  const cookie = cookieFrom(response);
  if (role === "staff") {
    await lilyPrisma.lilyUser.update({ where: { phoneNormalized: "+5567999990001" }, data: { role: "staff" } });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { cookie, csrf: me.json().csrfToken };
}

beforeEach(async () => {
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyOffer.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
  await lilyPrisma.lilyProduct.updateMany({ data: { isAvailable: true } });
  await lilyPrisma.lilyProductVariant.updateMany({ data: { isAvailable: true } });
});

afterAll(async () => {
  await app.close();
});

describe("CookLily catálogo", () => {
  it("publica categorias, produtos, LilyMix e combos sem autenticação", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/catalog?limit=40" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.categories.some((item: { slug: string }) => item.slug === "batidas-de-acai")).toBe(true);
    expect(body.categories.some((item: { slug: string }) => item.slug === "lilyshakes")).toBe(true);
    expect(body.products.some((item: { slug: string }) => item.slug === "lilymix")).toBe(true);
    expect(body.combos).toHaveLength(3);
  });

  it("busca sem acento encontra maracujá", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/catalog?q=maracuja&limit=40" });
    expect(response.statusCode).toBe(200);
    expect(response.json().products.some((item: { displayName: string }) => item.displayName.includes("Maracujá") || item.displayName.includes("Sol"))).toBe(true);
  });

  it("configura LilyMix válido e rejeita par incompatível", async () => {
    const flavors = await lilyPrisma.lilyFlavorComponent.findMany();
    const bySlug = Object.fromEntries(flavors.map((flavor) => [flavor.slug, flavor.id]));

    const valid = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-item",
      payload: {
        productId: "prod-lilymix",
        sizeMl: 500,
        flavorIds: [bySlug.morango, bySlug["creme-de-ninho"], bySlug.nutella],
        addons: []
      }
    });
    expect(valid.statusCode).toBe(200);
    expect(valid.json().totalPriceCents).toBe(3300);

    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-item",
      payload: {
        productId: "prod-lilymix",
        sizeMl: 500,
        flavorIds: [bySlug.cafe, bySlug.maracuja],
        addons: []
      }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().details.code).toBe("LILY_INCOMPATIBLE_FLAVORS");
  });

  it("aplica limite de adicionais", async () => {
    const flavors = await lilyPrisma.lilyFlavorComponent.findMany();
    const bySlug = Object.fromEntries(flavors.map((flavor) => [flavor.slug, flavor.id]));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-item",
      payload: {
        productId: "prod-lilymix",
        sizeMl: 300,
        flavorIds: [bySlug.banana],
        addons: [
          { addonId: "add-nutella", quantity: 2 },
          { addonId: "add-ninho", quantity: 2 },
          { addonId: "add-oreo", quantity: 1 }
        ]
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().details.code).toBe("LILY_ADDON_TOTAL_LIMIT");
  });

  it("nega admin para customer e exige CSRF de staff", async () => {
    const customer = await register("customer");
    const denied = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: customer.cookie }
    });
    expect(denied.statusCode).toBe(403);

    await lilyPrisma.lilyConsentRecord.deleteMany();
    await lilyPrisma.lilySession.deleteMany();
    await lilyPrisma.lilyUser.deleteMany();
    const staff = await register("staff");

    const csrfRejected = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/products/prod-lilymix",
      headers: { origin, cookie: staff.cookie },
      payload: { isAvailable: false }
    });
    expect(csrfRejected.statusCode).toBe(403);

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/products/prod-lilymix",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: { isAvailable: false }
    });
    expect(updated.statusCode).toBe(200);

    const catalog = await app.inject({ method: "GET", url: "/api/v1/lily/public/products/lilymix" });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().soldOut).toBe(true);
    expect(await lilyPrisma.lilyAdminAudit.count()).toBeGreaterThan(0);
  });

  it("mantém produto da semana e produto destaque como posições exclusivas e fora dos filtros", async () => {
    const originals = await lilyPrisma.lilyProduct.findMany({
      select: { id: true, featured: true, weeklyHighlight: true }
    });
    const staff = await register("staff");

    try {
      const first = await app.inject({
        method: "PATCH",
        url: "/api/v1/lily/admin/products/prod-lilymix",
        headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
        payload: { featured: true, weeklyHighlight: true }
      });
      expect(first.statusCode).toBe(200);

      const second = await app.inject({
        method: "PATCH",
        url: "/api/v1/lily/admin/products/prod-acai-sol-lily",
        headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
        payload: { featured: true, weeklyHighlight: true }
      });
      expect(second.statusCode).toBe(200);

      const weekly = await lilyPrisma.lilyProduct.findMany({ where: { weeklyHighlight: true } });
      const featured = await lilyPrisma.lilyProduct.findMany({ where: { featured: true } });
      expect(weekly).toHaveLength(1);
      expect(featured).toHaveLength(1);
      expect(weekly[0]?.id).toBe("prod-acai-sol-lily");
      expect(featured[0]?.id).toBe("prod-acai-sol-lily");

      const publicCatalog = await app.inject({
        method: "GET",
        url: "/api/v1/lily/public/catalog?q=produto-que-nao-existe&limit=1"
      });
      expect(publicCatalog.statusCode).toBe(200);
      const body = publicCatalog.json();
      expect(body.products).toHaveLength(0);
      expect(body.weeklyProduct.id).toBe("prod-acai-sol-lily");
      expect(body.featuredProduct.id).toBe("prod-acai-sol-lily");
    } finally {
      await lilyPrisma.lilyProduct.updateMany({
        data: { featured: false, weeklyHighlight: false }
      });
      for (const product of originals) {
        if (!product.featured && !product.weeklyHighlight) continue;
        await lilyPrisma.lilyProduct.update({
          where: { id: product.id },
          data: {
            featured: product.featured,
            weeklyHighlight: product.weeklyHighlight
          }
        });
      }
    }
  });

  it("aplica oferta publicada ao configurador público", async () => {
    const staff = await register("staff");
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/offers",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: {
        productId: "prod-acai-sol-lily",
        variantId: "var-sol-300",
        name: "Oferta teste Sol",
        regularPriceCents: 1500,
        offerPriceCents: 1400,
        status: "published",
        minProjectedMarginBps: 1000
      }
    });
    expect(created.statusCode).toBe(201);

    const configured = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-item",
      payload: {
        productId: "prod-acai-sol-lily",
        sizeMl: 300,
        flavorIds: [],
        addons: []
      }
    });
    expect(configured.statusCode).toBe(200);
    expect(configured.json().basePriceCents).toBe(1400);
    expect(configured.json().totalPriceCents).toBe(1400);
  });

  it("bloqueia publicação de variante com margem projetada menor que 10%", async () => {
    const staff = await register("staff");
    const variant = await lilyPrisma.lilyProductVariant.findUnique({ where: { id: "var-lilymix-300" } });
    expect(variant).not.toBeNull();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/variants/var-lilymix-300",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: { status: "published", projectedMarginBps: 900 }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().details.code).toBe("LILY_MARGIN_FLOOR");
  });

  it("não expõe dados internos de produção no catálogo público", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/catalog?limit=40" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const product = body.products.find((item: { slug: string }) => item.slug === "lilymix");
    expect(product).toBeTruthy();
    expect(product).not.toHaveProperty("preparationLeadMinutes");
    expect(product.variants[0]).not.toHaveProperty("projectedMarginBps");
    expect(product.flavors[0]).not.toHaveProperty("portion300");
    expect(product.flavors[0]).not.toHaveProperty("portion500");
    expect(product.flavors[0]).not.toHaveProperty("priceModifier300");
    expect(product.flavors[0]).not.toHaveProperty("priceModifier500");
    expect(product.addons[0]).not.toHaveProperty("portion300");
    expect(product.addons[0]).not.toHaveProperty("portion500");
    expect(product.addons[0]).not.toHaveProperty("flavorId");
  });

  it("publica combo legado como preset com sabores selecionados e trava alterações do cliente", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/catalog?limit=40" });
    expect(response.statusCode).toBe(200);
    const combo = response.json().combos.find((item: { id: string }) => item.id === "combo-dupla-lily");
    expect(combo).toBeTruthy();
    expect(combo.mode).toBe("preset");
    expect(combo.presetSelections).toHaveLength(2);
    expect(combo.presetSelections.every((selection: { product: unknown }) => Boolean(selection.product))).toBe(true);

    const selections = combo.presetSelections.map((selection: any) => ({
      productId: selection.productId,
      sizeMl: selection.sizeMl,
      flavorIds: selection.flavorIds,
      addons: selection.addons
    }));

    const quoted = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-combo",
      payload: { comboId: combo.id, selections }
    });
    expect(quoted.statusCode).toBe(200);
    expect(quoted.json().mode).toBe("preset");

    const tampered = structuredClone(selections);
    tampered[0].flavorIds = [];
    const rejected = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/configure-combo",
      payload: { comboId: combo.id, selections: tampered }
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().details.code).toBe("LILY_COMBO_PRESET_LOCKED");
  });

  it("montador de combo só abre quando o modo builder está habilitado", async () => {
    const combo = await lilyPrisma.lilyCombo.findUnique({ where: { id: "combo-dupla-lily" } });
    expect(combo).not.toBeNull();
    const originalRules = combo!.rulesJson;
    const rules = JSON.parse(originalRules);

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/lily/public/combos/combo-dupla-lily/builder"
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().details.code).toBe("LILY_COMBO_NOT_BUILDER");

    try {
      await lilyPrisma.lilyCombo.update({
        where: { id: "combo-dupla-lily" },
        data: { rulesJson: JSON.stringify({ ...rules, mode: "builder" }) }
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/lily/public/combos/combo-dupla-lily/builder"
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.quantity).toBe(2);
      expect(body.sizeMl).toBe(500);
      expect(body.options.length).toBeGreaterThan(0);
      for (const product of body.options) {
        expect(product.tags).toContain("simples");
        expect(product.configurationType).toBe("fixed");
        expect(product.variants.some((variant: { sizeMl: number; isAvailable: boolean }) =>
          variant.sizeMl === 500 && variant.isAvailable
        )).toBe(true);
        expect(product.variants[0]).not.toHaveProperty("projectedMarginBps");
      }
      expect(body.options.some((product: { slug: string }) => product.slug.includes("nutt"))).toBe(false);
    } finally {
      await lilyPrisma.lilyCombo.update({
        where: { id: "combo-dupla-lily" },
        data: { rulesJson: originalRules }
      });
    }
  });

});
