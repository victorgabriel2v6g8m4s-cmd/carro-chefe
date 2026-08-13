import { config } from "../config";

export const runtimeApiBase = `http://127.0.0.1:${config.port}/api/v1`;

function safeJson(value: unknown) { try { return JSON.stringify(value, null, 2); } catch { return String(value); } }

export async function runtimeApi<T>(route: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${runtimeApiBase}${route}`, { method, headers: { "Content-Type": "application/json", ...(config.agentApiKey ? { "X-Agent-Key": config.agentApiKey } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const details = Array.isArray(data.details) ? data.details.map((item: any) => `${item.path?.join(".") || "campo"}: ${item.message}`).join("; ") : data.details ? safeJson(data.details) : ""; throw new Error([data.error ?? `API ${response.status}`, details].filter(Boolean).join(" — ")); }
  return data as T;
}
