import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { config } from "../config";
import { ApiError } from "../lib/errors";
import { isAllowedOrigin } from "./origins";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const SIGNED_WEBHOOK_PATH = /^\/api\/v1\/integrations\/[^/]+\/webhook(?:\?|$)/;

function hasLoopbackHost(host: string | undefined) {
  if (!host) return false;
  try {
    const hostname = new URL(`http://${host}`).hostname;
    return ["127.0.0.1", "[::1]", "localhost"].includes(hostname);
  } catch {
    return false;
  }
}

export function hasValidAgentKey(value: string | string[] | undefined, configuredKey: string | null = config.agentApiKey) {
  if (!configuredKey || typeof value !== "string") return false;
  const expected = Buffer.from(configuredKey);
  const supplied = Buffer.from(value);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

export function isTrustedRequest(request: FastifyRequest) {
  if (hasValidAgentKey(request.headers["x-agent-key"])) return true;
  const origin = request.headers.origin;
  if (typeof origin === "string") return isAllowedOrigin(origin);
  if (request.headers["sec-fetch-site"] === "same-origin") return true;
  if (request.headers["sec-fetch-site"] === "same-site" && hasLoopbackHost(request.headers.host)) return true;
  return LOOPBACK_ADDRESSES.has(request.ip);
}

export async function requireTrustedRequest(request: FastifyRequest) {
  if (!isTrustedRequest(request)) {
    throw new ApiError(403, "Origem não autorizada para esta operação.", { code: "UNTRUSTED_REQUEST_ORIGIN" });
  }
}

export async function protectSensitiveMutation(request: FastifyRequest) {
  if (SAFE_METHODS.has(request.method) || SIGNED_WEBHOOK_PATH.test(request.raw.url ?? "")) return;
  await requireTrustedRequest(request);
}
