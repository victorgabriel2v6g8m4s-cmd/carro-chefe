import crypto from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_AGENT_SIGNATURE_NAMESPACE, parseLilyAgentPublicKey } from "./agent-auth-crypto";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";
const phone = `+55679${crypto.randomInt(10_000_000, 99_999_999)}`;
const keyDirectory = mkdtempSync(path.join(os.tmpdir(), "lily-agent-test-"));
const privateKeyPath = path.join(keyDirectory, "test-agent");
const publicKeyPath = `${privateKeyPath}.pub`;
let userId = "";
let codeSuffix = "";

execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", privateKeyPath], { windowsHide: true });
const rawPublicKey = readFileSync(publicKeyPath, "utf8").trim();
const parsedKey = parseLilyAgentPublicKey(rawPublicKey);
if (!parsedKey) throw new Error("Test setup could not parse its generated Ed25519 public key.");

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

function signChallenge(challenge: string) {
  const messagePath = path.join(keyDirectory, `challenge-${crypto.randomUUID()}.txt`);
  writeFileSync(messagePath, challenge, { encoding: "utf8", mode: 0o600 });
  execFileSync("ssh-keygen", ["-Y", "sign", "-f", privateKeyPath, "-n", LILY_AGENT_SIGNATURE_NAMESPACE, messagePath], {
    windowsHide: true, stdio: "ignore"
  });
  return readFileSync(`${messagePath}.sig`, "utf8");
}

async function cleanup() {
  if (userId) {
    await lilyPrisma.lilySession.deleteMany({ where: { userId } });
    await lilyPrisma.lilyAgentKey.deleteMany({ where: { userId } });
    await lilyPrisma.lilyAdminAudit.deleteMany({ where: { actorUserId: userId } });
    await lilyPrisma.lilyUser.deleteMany({ where: { id: userId } });
    userId = "";
  }
  if (codeSuffix) {
    await lilyPrisma.lilyVipCode.deleteMany({ where: { displaySuffix: codeSuffix } });
    codeSuffix = "";
  }
}

afterEach(cleanup);
afterAll(async () => {
  await cleanup();
  await app.close();
  rmSync(keyDirectory, { recursive: true, force: true });
});

describe("autenticação administrativa por chave de agente", () => {
  it("troca prova Ed25519 por sessão admin curta, audita ações e revoga acesso imediatamente", async () => {
    const user = await lilyPrisma.lilyUser.create({ data: {
      phoneNormalized: phone,
      passwordHash: "disabled-agent-password-login",
      displayName: "Agente de teste",
      role: "admin",
      status: "active",
      agentIdentity: true,
      staffPasswordUpgradeRequired: true
    } });
    userId = user.id;
    const key = await lilyPrisma.lilyAgentKey.create({ data: {
      userId,
      label: "Teste de autenticação",
      publicKey: parsedKey.publicKey,
      fingerprint: parsedKey.fingerprint
    } });

    const unknownKey = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/challenges", headers: { origin },
      payload: { fingerprint: `SHA256:${"a".repeat(43)}` }
    });
    expect(unknownKey.statusCode).toBe(401);

    const passwordLogin = await app.inject({ method: "POST", url: "/api/v1/lily/auth/login", headers: { origin }, payload: { phone, password: "any-test-password" } });
    expect(passwordLogin.statusCode).toBe(401);

    const challengeResponse = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/challenges", headers: { origin },
      payload: { fingerprint: parsedKey.fingerprint }
    });
    expect(challengeResponse.statusCode).toBe(200);
    expect(challengeResponse.headers["cache-control"]).toBe("no-store");
    const challenge = challengeResponse.json() as { challengeId: string; challenge: string; namespace: string };
    expect(challenge.namespace).toBe(LILY_AGENT_SIGNATURE_NAMESPACE);
    const staleChallengeResponse = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/challenges", headers: { origin },
      payload: { fingerprint: parsedKey.fingerprint }
    });
    const staleChallenge = staleChallengeResponse.json() as { challengeId: string };
    await lilyPrisma.lilyAgentAuthChallenge.update({ where: { id: staleChallenge.challengeId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const staleSignature = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/verify", headers: { origin },
      payload: { challengeId: staleChallenge.challengeId, signature: "invalid-signature-".padEnd(100, "x") }
    });
    expect(staleSignature.statusCode).toBe(401);

    const invalid = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/verify", headers: { origin },
      payload: { challengeId: challenge.challengeId, signature: "invalid-signature-".padEnd(100, "x") }
    });
    expect(invalid.statusCode).toBe(401);

    const signature = signChallenge(challenge.challenge);
    const verified = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/verify", headers: { origin },
      payload: { challengeId: challenge.challengeId, signature }
    });
    expect(verified.statusCode).toBe(200);
    const firstTicket = verified.json().ticket as string;
    expect(firstTicket).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
    const challengeReplay = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/verify", headers: { origin },
      payload: { challengeId: challenge.challengeId, signature }
    });
    expect(challengeReplay.statusCode).toBe(401);
    const firstTicketHash = crypto.createHash("sha256").update(firstTicket).digest("hex");
    await lilyPrisma.lilyAgentAuthHandoff.update({ where: { ticketHash: firstTicketHash }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expiredTicket = await app.inject({ method: "POST", url: "/api/v1/lily/auth/agent/exchange", headers: { origin }, payload: { ticket: firstTicket } });
    expect(expiredTicket.statusCode).toBe(401);

    const nextChallengeResponse = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/challenges", headers: { origin },
      payload: { fingerprint: parsedKey.fingerprint }
    });
    const nextChallenge = nextChallengeResponse.json() as { challengeId: string; challenge: string };
    const nextSignature = signChallenge(nextChallenge.challenge);
    const nextVerified = await app.inject({
      method: "POST", url: "/api/v1/lily/auth/agent/verify", headers: { origin },
      payload: { challengeId: nextChallenge.challengeId, signature: nextSignature }
    });
    expect(nextVerified.statusCode).toBe(200);
    const ticket = nextVerified.json().ticket as string;

    const exchanged = await app.inject({ method: "POST", url: "/api/v1/lily/auth/agent/exchange", headers: { origin }, payload: { ticket } });
    expect(exchanged.statusCode).toBe(200);
    expect(exchanged.headers["cache-control"]).toBe("no-store");
    expect(exchanged.headers["set-cookie"]).toContain("HttpOnly");
    expect(exchanged.headers["set-cookie"]).toContain("SameSite=Lax");
    expect(exchanged.json()).toMatchObject({
      authenticated: true,
      user: { id: userId, role: "admin", staffPasswordUpgradeRequired: false, mfaEnabled: true },
      mfa: { required: true, enabled: true, verified: true, setupRequired: false },
      authenticationMethod: "agent-key"
    });
    const cookie = cookieFrom(exchanged);
    const csrf = exchanged.json().csrfToken as string;
    const status = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
    expect(status.json().mfa).toMatchObject({ required: true, enabled: true, verified: true, setupRequired: false });

    const adminAction = await app.inject({
      method: "POST", url: "/api/v1/lily/admin/vip/codes",
      headers: { cookie, "x-lily-csrf": csrf, origin },
      payload: { kind: "vip", couponIds: [], startsAt: null, endsAt: null, maxRedemptions: null }
    });
    const missingCsrf = await app.inject({
      method: "POST", url: "/api/v1/lily/admin/vip/codes", headers: { cookie, origin },
      payload: { kind: "vip", couponIds: [], startsAt: null, endsAt: null, maxRedemptions: null }
    });
    expect(missingCsrf.statusCode).toBe(403);
    expect(adminAction.statusCode).toBe(201);
    codeSuffix = (adminAction.json().invite.displaySuffix as string);
    const audit = await lilyPrisma.lilyAdminAudit.findFirst({ where: { actorUserId: userId, action: "create", entityType: "vip-code" } });
    expect(audit).toMatchObject({ actorType: "agent", agentKeyId: key.id, agentKeyFingerprint: parsedKey.fingerprint });

    const replay = await app.inject({ method: "POST", url: "/api/v1/lily/auth/agent/exchange", headers: { origin }, payload: { ticket } });
    expect(replay.statusCode).toBe(401);
    await lilyPrisma.lilyAgentKey.update({ where: { id: key.id }, data: { status: "revoked", revokedAt: new Date() } });
    const revokedSession = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
    expect(revokedSession.statusCode).toBe(401);
  });
});
