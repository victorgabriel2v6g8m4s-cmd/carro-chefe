import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { createLilySession, getConsentSnapshot, isAllowedLilyAgentIdentity, publicLilyUser } from "./auth";
import { LILY_AGENT_SIGNATURE_NAMESPACE, verifyLilyAgentSignature } from "./agent-auth-crypto";

const challengeInput = z.object({ fingerprint: z.string().regex(/^SHA256:[A-Za-z0-9+/]{43}$/) }).strict();
const verifyInput = z.object({
  challengeId: z.string().uuid(),
  signature: z.string().min(80).max(8192)
}).strict();
const handoffInput = z.object({ ticket: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/) }).strict();
const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const HANDOFF_TTL_MS = 60 * 1000;
const AGENT_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const AGENT_AUTH_ORIGIN = "https://carrochefe.com";

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function invalidAgentAuth() {
  return new ApiError(401, "Não foi possível autenticar esta identidade de agente.", {
    code: "LILY_AGENT_AUTH_INVALID"
  });
}

export async function lilyAgentAuthRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/auth/agent/challenges", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const { fingerprint } = challengeInput.parse(request.body);
    const key = await lilyPrisma.lilyAgentKey.findUnique({
      where: { fingerprint },
      include: { user: true }
    });
    if (!key || key.status !== "active" || key.revokedAt
      || !isAllowedLilyAgentIdentity(key.user)) throw invalidAgentAuth();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
    const id = crypto.randomUUID();
    const nonce = crypto.randomBytes(32).toString("base64url");
    const challenge = [
      "CookLily agent authentication v1",
      `origin=${AGENT_AUTH_ORIGIN}`,
      `key=${key.fingerprint}`,
      `id=${id}`,
      `nonce=${nonce}`,
      `expires=${expiresAt.toISOString()}`
    ].join("\n");
    await lilyPrisma.lilyAgentAuthChallenge.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    await lilyPrisma.lilyAgentAuthHandoff.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    await lilyPrisma.lilyAgentAuthChallenge.create({ data: { id, agentKeyId: key.id, challenge, expiresAt } });
    return { challengeId: id, challenge, namespace: LILY_AGENT_SIGNATURE_NAMESPACE };
  });

  app.post("/api/v1/lily/auth/agent/verify", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const { challengeId, signature } = verifyInput.parse(request.body);
    const challenge = await lilyPrisma.lilyAgentAuthChallenge.findUnique({
      where: { id: challengeId },
      include: { agentKey: { include: { user: true } } }
    });
    const now = new Date();
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now || challenge.attempts >= 5
      || challenge.agentKey.status !== "active" || challenge.agentKey.revokedAt
      || !isAllowedLilyAgentIdentity(challenge.agentKey.user)
      || !verifyLilyAgentSignature(challenge.agentKey.publicKey, signature, challenge.challenge)) {
      if (challenge && !challenge.consumedAt && challenge.expiresAt > now && challenge.attempts < 5) {
        await lilyPrisma.lilyAgentAuthChallenge.updateMany({
          where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: now } },
          data: { attempts: { increment: 1 } }
        });
      }
      throw invalidAgentAuth();
    }

    const claimed = await lilyPrisma.lilyAgentAuthChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });
    if (claimed.count !== 1) throw invalidAgentAuth();

    const ticket = crypto.randomBytes(32).toString("base64url");
    await lilyPrisma.lilyAgentAuthHandoff.create({
      data: {
        agentKeyId: challenge.agentKeyId,
        ticketHash: hashToken(ticket),
        expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS)
      }
    });
    return { ticket, expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS).toISOString() };
  });

  app.post("/api/v1/lily/auth/agent/exchange", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const { ticket } = handoffInput.parse(request.body);
    const now = new Date();
    const handoff = await lilyPrisma.lilyAgentAuthHandoff.findUnique({
      where: { ticketHash: hashToken(ticket) },
      include: { agentKey: { include: { user: true } } }
    });
    if (!handoff || handoff.consumedAt || handoff.expiresAt <= now
      || handoff.agentKey.status !== "active" || handoff.agentKey.revokedAt
      || !isAllowedLilyAgentIdentity(handoff.agentKey.user)) throw invalidAgentAuth();

    const claimed = await lilyPrisma.lilyAgentAuthHandoff.updateMany({
      where: { id: handoff.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });
    if (claimed.count !== 1) throw invalidAgentAuth();

    const session = await createLilySession(handoff.agentKey.userId, request, reply, {
      agentKeyId: handoff.agentKeyId,
      ttlMs: AGENT_SESSION_TTL_MS
    });
    await lilyPrisma.lilyAgentKey.update({ where: { id: handoff.agentKeyId }, data: { lastUsedAt: now } });
    return {
      authenticated: true,
      user: publicLilyUser({
        id: handoff.agentKey.user.id,
        phoneNormalized: handoff.agentKey.user.phoneNormalized,
        displayName: handoff.agentKey.user.displayName,
        role: handoff.agentKey.user.role,
        status: handoff.agentKey.user.status,
        avatarMediaId: handoff.agentKey.user.avatarMediaId,
        rankingOptIn: handoff.agentKey.user.rankingOptIn,
        isTestAccount: handoff.agentKey.user.isTestAccount,
        staffPasswordUpgradeRequired: false,
        mfaEnabled: handoff.agentKey.user.mfaEnabled,
        agentIdentity: true
      }, true),
      csrfToken: session.csrfToken,
      sessionExpiresAt: session.expiresAt,
      consents: await getConsentSnapshot(handoff.agentKey.userId),
      mfa: { required: false, enabled: handoff.agentKey.user.mfaEnabled, verified: false, setupRequired: false },
      authenticationMethod: "agent-key"
    };
  });
}
