import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";
const phone = "+5567999978191";
let productId = "";
let categoryId = "";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  return (Array.isArray(value) ? value[0] : String(value ?? "")).split(";")[0];
}

async function register() {
  const response = await app.inject({ method: "POST", url: "/api/v1/lily/auth/register", remoteAddress: "127.8.19.1", headers: { origin }, payload: {
    phone, password: "senha-reels-social-cooklily-2026", displayName: "Reels Social Teste", termsAccepted: true,
    termsVersion: LILY_TERMS_VERSION, privacyPolicyVersion: LILY_PRIVACY_VERSION,
    consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
  } });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { cookie, csrf: me.json().csrfToken };
}

async function cleanup() {
  await lilyPrisma.lilyUser.deleteMany({ where: { phoneNormalized: phone } });
  if (productId) await lilyPrisma.lilyProduct.deleteMany({ where: { id: productId } });
  if (categoryId) await lilyPrisma.lilyCategory.deleteMany({ where: { id: categoryId } });
  productId = "";
  categoryId = "";
}

afterEach(cleanup);
afterAll(async () => { await cleanup(); await app.close(); });

describe("CookLily Reels sociais", () => {
  it("persiste curtidas, salvos e comentários por conta com CSRF e retorno privado no perfil", async () => {
    const category = await lilyPrisma.lilyCategory.create({ data: { slug: "reels-social-teste", name: "Reels social teste", status: "published" } });
    categoryId = category.id;
    const product = await lilyPrisma.lilyProduct.create({ data: { categoryId, slug: "reels-social-teste", displayName: "Reel social teste", status: "published", isAvailable: true } });
    productId = product.id;
    const user = await register();

    const rejected = await app.inject({ method: "POST", url: "/api/v1/lily/customer/reels/action", headers: { origin, cookie: user.cookie }, payload: { productId, action: "like", enabled: true } });
    expect(rejected.statusCode).toBe(403);

    for (const action of ["like", "save"] as const) {
      const response = await app.inject({ method: "POST", url: "/api/v1/lily/customer/reels/action", headers: { origin, cookie: user.cookie, "x-lily-csrf": user.csrf }, payload: { productId, action, enabled: true } });
      expect(response.statusCode).toBe(200);
    }
    const comment = await app.inject({ method: "POST", url: "/api/v1/lily/customer/reels/comments", headers: { origin, cookie: user.cookie, "x-lily-csrf": user.csrf }, payload: { productId, body: "Gostei deste Reel." } });
    expect(comment.statusCode).toBe(201);
    expect(comment.json().name).toBe("Cliente CookLily");

    const social = await app.inject({ method: "GET", url: `/api/v1/lily/public/reels/${productId}/social`, headers: { cookie: user.cookie } });
    expect(social.json()).toMatchObject({ likeCount: 1, liked: true, saved: true });
    expect(social.json().comments[0].body).toBe("Gostei deste Reel.");
    const saved = await app.inject({ method: "GET", url: "/api/v1/lily/customer/reels/saved", headers: { cookie: user.cookie } });
    expect(saved.json().reels).toMatchObject([{ id: productId, title: "Reel social teste" }]);
  });
});
