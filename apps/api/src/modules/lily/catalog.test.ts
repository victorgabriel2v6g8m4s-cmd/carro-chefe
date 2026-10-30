import crypto from "node:crypto";
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
  const phone = `679${role === "staff" ? "99" : "98"}${String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")}`;
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
  const body = response.json();
  if (!body.user?.id) throw new Error(`Falha ao cadastrar usuário de teste: HTTP ${response.statusCode} ${JSON.stringify(body)}`);
  const userId = body.user.id;
  if (role === "staff") {
    await lilyPrisma.lilyUser.update({
      where: { id: userId },
      data: { role: "staff", mfaEnabled: true }
    });
    await lilyPrisma.lilySession.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: new Date() }
    });
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
  await lilyPrisma.lilyProduct.updateMany({ data: { minimumAddonUnits: 0, maximumAddonUnits: 4 } });
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

  it("agrega alergênicos da base, sabor e adicional sem tratar não revisado como seguro", async () => {
    const product = await lilyPrisma.lilyProduct.findUnique({ where: { id: "prod-lilymix" } });
    const banana = await lilyPrisma.lilyFlavorComponent.findUnique({ where: { slug: "banana" } });
    const addon = await lilyPrisma.lilyAddon.findUnique({ where: { id: "add-ninho" } });
    expect(product && banana && addon).toBeTruthy();

    try {
      await lilyPrisma.lilyProduct.update({
        where: { id: "prod-lilymix" },
        data: {
          allergenReviewStatus: "reviewed",
          allergenContainsJson: JSON.stringify(["milk"]),
          allergenMayContainJson: "[]"
        }
      });
      await lilyPrisma.lilyFlavorComponent.update({
        where: { id: banana!.id },
        data: {
          allergenReviewStatus: "reviewed",
          allergenContainsJson: "[]",
          allergenMayContainJson: JSON.stringify(["peanuts"])
        }
      });
      await lilyPrisma.lilyAddon.update({
        where: { id: "add-ninho" },
        data: {
          allergenReviewStatus: "reviewed",
          allergenContainsJson: JSON.stringify(["soy"]),
          allergenMayContainJson: JSON.stringify(["milk"])
        }
      });

      const reviewed = await app.inject({
        method: "POST",
        url: "/api/v1/lily/public/configure-item",
        payload: {
          productId: "prod-lilymix",
          sizeMl: 300,
          flavorIds: [banana!.id],
          addons: [{ addonId: "add-ninho", quantity: 1 }]
        }
      });
      expect(reviewed.statusCode).toBe(200);
      expect(reviewed.json().allergens).toMatchObject({
        complete: true,
        unreviewed: []
      });
      expect(reviewed.json().allergens.contains.map((item: any) => item.code)).toEqual(["soy", "milk"]);
      expect(reviewed.json().allergens.mayContain.map((item: any) => item.code)).toEqual(["peanuts"]);

      await lilyPrisma.lilyAddon.update({
        where: { id: "add-ninho" },
        data: { allergenReviewStatus: "unreviewed" }
      });
      const incomplete = await app.inject({
        method: "POST",
        url: "/api/v1/lily/public/configure-item",
        payload: {
          productId: "prod-lilymix",
          sizeMl: 300,
          flavorIds: [banana!.id],
          addons: [{ addonId: "add-ninho", quantity: 1 }]
        }
      });
      expect(incomplete.statusCode).toBe(200);
      expect(incomplete.json().allergens.complete).toBe(false);
      expect(incomplete.json().allergens.unreviewed).toContain(addon!.name);
    } finally {
      await lilyPrisma.lilyProduct.update({
        where: { id: product!.id },
        data: {
          allergenReviewStatus: product!.allergenReviewStatus,
          allergenContainsJson: product!.allergenContainsJson,
          allergenMayContainJson: product!.allergenMayContainJson
        }
      });
      await lilyPrisma.lilyFlavorComponent.update({
        where: { id: banana!.id },
        data: {
          allergenReviewStatus: banana!.allergenReviewStatus,
          allergenContainsJson: banana!.allergenContainsJson,
          allergenMayContainJson: banana!.allergenMayContainJson
        }
      });
      await lilyPrisma.lilyAddon.update({
        where: { id: addon!.id },
        data: {
          allergenReviewStatus: addon!.allergenReviewStatus,
          allergenContainsJson: addon!.allergenContainsJson,
          allergenMayContainJson: addon!.allergenMayContainJson
        }
      });
    }
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

  it("exige o mínimo e valida máximo, limite individual e preço configurado por produto", async () => {
    const productId = "prod-lilymix";
    const banana = await lilyPrisma.lilyFlavorComponent.findUniqueOrThrow({ where: { slug: "banana" } });
    const product = await lilyPrisma.lilyProduct.findUniqueOrThrow({ where: { id: productId } });
    const link = await lilyPrisma.lilyProductAddon.findUniqueOrThrow({ where: { productId_addonId: { productId, addonId: "add-ninho" } } });
    try {
      await lilyPrisma.lilyProduct.update({ where: { id: productId }, data: { minimumAddonUnits: 2, maximumAddonUnits: 3 } });
      await lilyPrisma.lilyProductAddon.update({
        where: { productId_addonId: { productId, addonId: "add-ninho" } },
        data: { individualLimit: 1, priceOverride: 777 }
      });

      const minimum = await app.inject({ method: "POST", url: "/api/v1/lily/public/configure-item", payload: {
        productId, sizeMl: 300, flavorIds: [banana.id], addons: []
      } });
      expect(minimum.statusCode).toBe(400);
      expect(minimum.json().details.code).toBe("LILY_ADDON_MINIMUM_REQUIRED");
      expect(minimum.json().error).toContain("Selecione pelo menos 2 adicional(is) para continuar");

      const total = await app.inject({ method: "POST", url: "/api/v1/lily/public/configure-item", payload: {
        productId, sizeMl: 300, flavorIds: [banana.id], addons: [
          { addonId: "add-ninho", quantity: 1 }, { addonId: "add-nutella", quantity: 2 }, { addonId: "add-oreo", quantity: 1 }
        ]
      } });
      expect(total.statusCode).toBe(400);
      expect(total.json().details.code).toBe("LILY_ADDON_TOTAL_LIMIT");

      const individual = await app.inject({ method: "POST", url: "/api/v1/lily/public/configure-item", payload: {
        productId, sizeMl: 300, flavorIds: [banana.id], addons: [{ addonId: "add-ninho", quantity: 2 }]
      } });
      expect(individual.statusCode).toBe(400);
      expect(individual.json().details.code).toBe("LILY_ADDON_INDIVIDUAL_LIMIT");

      const priced = await app.inject({ method: "POST", url: "/api/v1/lily/public/configure-item", payload: {
        productId, sizeMl: 300, flavorIds: [banana.id], addons: [
          { addonId: "add-ninho", quantity: 1 }, { addonId: "add-oreo", quantity: 1 }
        ]
      } });
      expect(priced.statusCode).toBe(200);
      expect(priced.json().addons.find((item: any) => item.addonId === "add-ninho").unitPriceCents).toBe(777);
    } finally {
      await lilyPrisma.lilyProduct.update({ where: { id: productId }, data: {
        minimumAddonUnits: product.minimumAddonUnits, maximumAddonUnits: product.maximumAddonUnits
      } });
      await lilyPrisma.lilyProductAddon.update({
        where: { productId_addonId: { productId, addonId: "add-ninho" } },
        data: { individualLimit: link.individualLimit, priceOverride: link.priceOverride }
      });
    }
  });

  it("reutiliza o mesmo adicional cadastrado em produtos distintos com preços próprios", async () => {
    const staff = await register("staff");
    const productIds = ["prod-lilymix", "prod-acai-sol-lily"];
    const existingLinks = await lilyPrisma.lilyProductAddon.findMany({ where: { productId: { in: productIds } } });
    const created = await app.inject({
      method: "POST", url: "/api/v1/lily/admin/addons",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: { slug: `reuso-${crypto.randomUUID()}`, name: "Adicional de teste", priceCents: 300, portion300: 10, portion500: 15 }
    });
    expect(created.statusCode).toBe(201);
    const addonId = created.json().id as string;
    try {
      for (const [index, productId] of productIds.entries()) {
        const prior = existingLinks.filter((link) => link.productId === productId).map((link) => ({
          addonId: link.addonId, allowed: link.allowed, individualLimit: link.individualLimit,
          priceOverride: link.priceOverride, portion300: link.portion300, portion500: link.portion500
        }));
        const response = await app.inject({
          method: "PUT", url: `/api/v1/lily/admin/products/${productId}/addons`,
          headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
          payload: { addons: [...prior, { addonId, allowed: true, individualLimit: 2, priceOverride: index === 0 ? 444 : 555 }] }
        });
        expect(response.statusCode).toBe(200);
      }
      const links = await lilyPrisma.lilyProductAddon.findMany({ where: { addonId } });
      expect(links).toHaveLength(2);
      expect(links.map((link) => link.priceOverride).sort()).toEqual([444, 555]);
    } finally {
      await lilyPrisma.lilyProductAddon.deleteMany({ where: { addonId } });
      await lilyPrisma.lilyAddon.delete({ where: { id: addonId } });
    }
  });

  it("nega admin para customer e exige CSRF de staff", async () => {
    const customer = await register("customer");
    const denied = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: customer.cookie }
    });
    expect(denied.statusCode).toBe(403);
    const deniedIndex = await app.inject({ method: "GET", url: "/api/v1/lily/admin/catalog/index", headers: { cookie: customer.cookie } });
    const deniedEditor = await app.inject({ method: "GET", url: "/api/v1/lily/admin/products/prod-lilymix/editor", headers: { cookie: customer.cookie } });
    expect(deniedIndex.statusCode).toBe(403);
    expect(deniedEditor.statusCode).toBe(403);

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

  it("carrega o índice resumido e o detalhe de somente um produto sob demanda", async () => {
    const staff = await register("staff");
    const index = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog/index",
      headers: { cookie: staff.cookie }
    });
    expect(index.statusCode).toBe(200);
    const summary = index.json().products.find((product: { id: string }) => product.id === "prod-lilymix");
    expect(summary).toMatchObject({ id: "prod-lilymix", category: { id: expect.any(String) }, variants: expect.any(Array) });
    expect(summary).not.toHaveProperty("rawVariants");
    expect(index.json()).not.toHaveProperty("flavors");
    expect(index.json()).not.toHaveProperty("media");

    const detail = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/products/prod-lilymix/editor",
      headers: { cookie: staff.cookie }
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().product.id).toBe("prod-lilymix");
    expect(detail.json().product.rawVariants.length).toBeGreaterThan(0);
    expect(detail.json()).not.toHaveProperty("products");
  });

  it("permite staff revisar alergênicos e publica somente a forma minimizada", async () => {
    const original = await lilyPrisma.lilyProduct.findUnique({ where: { id: "prod-lilymix" } });
    expect(original).toBeTruthy();
    const staff = await register("staff");

    try {
      const updated = await app.inject({
        method: "PATCH",
        url: "/api/v1/lily/admin/products/prod-lilymix",
        headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
        payload: {
          allergens: {
            allergenReviewStatus: "reviewed",
            allergenContains: ["milk", "soy"],
            allergenMayContain: ["peanuts"]
          }
        }
      });
      expect(updated.statusCode).toBe(200);

      const admin = await app.inject({
        method: "GET",
        url: "/api/v1/lily/admin/catalog",
        headers: { cookie: staff.cookie }
      });
      expect(admin.statusCode).toBe(200);
      expect(admin.json().allergenCatalog.some((item: any) => item.code === "milk")).toBe(true);
      const adminProduct = admin.json().products.find((item: any) => item.id === "prod-lilymix");
      expect(adminProduct.rawAllergens).toEqual({
        reviewStatus: "reviewed",
        contains: ["soy", "milk"],
        mayContain: ["peanuts"]
      });

      const publicProduct = await app.inject({
        method: "GET",
        url: "/api/v1/lily/public/products/lilymix"
      });
      expect(publicProduct.statusCode).toBe(200);
      expect(publicProduct.json().allergens).toMatchObject({
        reviewStatus: "reviewed",
        contains: [
          { code: "soy", label: "soja" },
          { code: "milk", label: "leite de todos os mamíferos" }
        ],
        mayContain: [{ code: "peanuts", label: "amendoim" }]
      });
      expect(publicProduct.json()).not.toHaveProperty("allergenContainsJson");
      expect(publicProduct.json()).not.toHaveProperty("allergenMayContainJson");
    } finally {
      await lilyPrisma.lilyProduct.update({
        where: { id: original!.id },
        data: {
          allergenReviewStatus: original!.allergenReviewStatus,
          allergenContainsJson: original!.allergenContainsJson,
          allergenMayContainJson: original!.allergenMayContainJson
        }
      });
    }
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
