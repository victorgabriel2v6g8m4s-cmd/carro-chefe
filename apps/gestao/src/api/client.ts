type ApiErrorPayload = { error?: unknown; message?: unknown };

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const payload = body as ApiErrorPayload;
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.message === "string") return payload.message;
  }
  return `Falha HTTP ${status}`;
}

export async function api<T = void>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body && !isForm ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(body, response.status));
  return body as T;
}

export const json = (method: "POST" | "PUT" | "PATCH" | "DELETE", body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
