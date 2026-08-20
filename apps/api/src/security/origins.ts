import { config } from "../config";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

function normalizedOrigin(input: string) {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

const configuredOrigins = new Set(
  config.allowedCorsOrigins
    .map((origin) => normalizedOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin))
);

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return false;
  const normalized = normalizedOrigin(origin);
  if (!normalized) return false;
  if (configuredOrigins.has(normalized)) return true;
  const url = new URL(normalized);
  return LOOPBACK_HOSTS.has(url.hostname);
}

export function corsOrigin(origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) {
  callback(null, origin === undefined || isAllowedOrigin(origin));
}
