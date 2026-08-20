import Fastify from "fastify";
import cors from "@fastify/cors";
import { afterEach, describe, expect, it } from "vitest";
import { corsOrigin, hasValidAgentKey, protectSensitiveMutation } from "../../security";
import { safeProjectFile } from "./file-access";

const apps: Array<ReturnType<typeof Fastify>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function securityFixture() {
  const app = Fastify();
  apps.push(app);
  await app.register(cors, { origin: corsOrigin });
  app.addHook("onRequest", protectSensitiveMutation);
  app.post("/change", async () => ({ changed: true }));
  app.post("/api/v1/integrations/erp/webhook", async () => ({ reachedSignatureBoundary: true }));
  return app;
}

describe("proteção de origem", () => {
  it("aceita a Central local e recusa mutação disparada por site externo", async () => {
    const app = await securityFixture();
    const local = await app.inject({ method: "POST", url: "/change", headers: { origin: "http://127.0.0.1:4174" } });
    const external = await app.inject({ method: "POST", url: "/change", headers: { origin: "https://malicioso.example" } });
    expect(local.statusCode).toBe(200);
    expect(local.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4174");
    expect(external.statusCode).toBe(403);
    expect(external.json()).toMatchObject({ statusCode: 403 });
    expect(external.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("deixa webhook assinado chegar à própria fronteira de autenticação", async () => {
    const app = await securityFixture();
    const response = await app.inject({ method: "POST", url: "/api/v1/integrations/erp/webhook", headers: { origin: "https://erp.example" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reachedSignatureBoundary: true });
  });

  it("valida a chave interna por comparação segura", () => {
    expect(hasValidAgentKey("chave-correta", "chave-correta")).toBe(true);
    expect(hasValidAgentKey("chave-incorreta", "chave-correta")).toBe(false);
    expect(hasValidAgentKey(undefined, "chave-correta")).toBe(false);
  });

  it("limita a pré-visualização a arquivos não sensíveis do projeto", async () => {
    await expect(safeProjectFile("package.json")).resolves.toMatchObject({ relative: "package.json" });
    await expect(safeProjectFile("../package.json")).rejects.toMatchObject({ statusCode: 403 });
    await expect(safeProjectFile(".env.example")).rejects.toMatchObject({ statusCode: 403 });
  });
});
