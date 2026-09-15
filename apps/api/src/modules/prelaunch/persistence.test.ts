import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../../..");
const databasePath = path.join(root, ".runtime", `test-prelaunch-${process.pid}.db`);
let app: Awaited<ReturnType<typeof import("../../app")["buildApp"]>>;
let prisma: typeof import("@carro-chefe/database")["prisma"];
const signup = (phone: string, attribution = {}) => ({
  phone, attribution, marketingConsent: true,
  consentVersion: "prelaunch-whatsapp-v1", privacyPolicyVersion: "prelaunch-privacy-v1"
});

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = `file:${databasePath}`;
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  const migrations = path.join(root, "packages/database/prisma/migrations");
  for (const dir of readdirSync(migrations, { withFileTypes: true }).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    sqlite.exec(readFileSync(path.join(migrations, dir.name, "migration.sql"), "utf8"));
  }
  sqlite.close();
  app = await (await import("../../app")).buildApp();
  prisma = (await import("@carro-chefe/database")).prisma;
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
  // Apenas arquivos desta fixture, com caminho absoluto conhecido e isolado.
  for (const suffix of ["", "-wal", "-shm", "-journal"]) rmSync(databasePath + suffix, { force: true });
});

it("grava campanha, consentimento e acesso direto em linhas distintas", async () => {
  const campaign = await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/signup", payload: signup("11900000001", { ccQr: "QR-001", ccCampaign: "banner", ccVariant: "A" }) });
  const direct = await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/signup", payload: signup("11900000002") });
  expect(campaign.statusCode).toBe(201); expect(direct.statusCode).toBe(201);
  const rows = await prisma.prelaunchLead.findMany({ orderBy: { signupAt: "asc" } });
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ ccQr: "QR-001", ccCampaign: "banner", ccVariant: "A", status: "active", consentVersion: "prelaunch-whatsapp-v1" });
  expect(rows[0].marketingConsentAt).toBeInstanceOf(Date);
  expect(rows[1]).toMatchObject({ ccQr: null, ccCampaign: null, ccVariant: null });
  expect(campaign.json()).toEqual({ status: "created" });
});

it("duplicidade não cria outra linha nem troca a origem original", async () => {
  const duplicate = await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/signup", payload: signup("+55 (11) 90000-0001") });
  expect(duplicate.json()).toEqual({ status: "duplicate" });
  expect(await prisma.prelaunchLead.count()).toBe(2);
  expect((await prisma.prelaunchLead.findFirst({ where: { ccQr: "QR-001" } }))?.ccCampaign).toBe("banner");
});

it("recusa telefone e consentimento inválidos; honeypot não persiste", async () => {
  for (const payload of [signup("11111111111"), { ...signup("11900000003"), marketingConsent: false }]) {
    expect((await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/signup", payload })).statusCode).toBe(400);
  }
  await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/signup", payload: { ...signup("11900000003"), website: "bot" } });
  expect(await prisma.prelaunchLead.count()).toBe(2);
});

it("persiste cliques por campanha e bloqueia telefone na metadata", async () => {
  const payload = { sessionId: "test-session-00000001", event: "whatsapp_click", path: "/", attribution: { ccQr: "QR-001", ccCampaign: "banner" }, metadata: { section: "social" } };
  expect((await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/events", payload })).statusCode).toBe(202);
  expect((await app.inject({ method: "POST", url: "/api/v1/public/prelaunch/events", payload: { ...payload, metadata: { phone: "11900000001" } } })).statusCode).toBe(400);
  expect(await prisma.prelaunchAnalyticsEvent.count()).toBe(1);
  expect(await prisma.prelaunchAnalyticsEvent.findFirst()).toMatchObject({ event: "whatsapp_click", ccCampaign: "banner" });
});
