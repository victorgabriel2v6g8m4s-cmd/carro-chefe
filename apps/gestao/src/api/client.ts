export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body && !isForm ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Falha HTTP ${response.status}`);
  return body as T;
}

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
