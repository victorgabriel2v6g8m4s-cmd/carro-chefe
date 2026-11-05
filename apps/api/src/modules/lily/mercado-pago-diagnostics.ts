function safeProviderCode(value: unknown) {
  const code = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  return /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : undefined;
}

function retryAfterSeconds(response: Response) {
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return null;
  if (/^\d{1,7}$/.test(value)) {
    const seconds = Number(value);
    return seconds <= 604_800 ? seconds : null;
  }
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
  return seconds <= 604_800 ? seconds : null;
}

function errorCodeFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return safeProviderCode((value as Record<string, unknown>).code);
}

function nestedCauseCodes(value: unknown, depth = 0): string[] {
  if (depth > 3 || !value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => nestedCauseCodes(entry, depth + 1)).slice(0, 5);

  const record = value as Record<string, unknown>;
  const ownCode = safeProviderCode(record.code);
  const nested = [record.cause, record.causes, record.errors, record.details]
    .flatMap((entry) => nestedCauseCodes(entry, depth + 1));
  return [...(ownCode ? [ownCode] : []), ...nested].slice(0, 5);
}

/** Retorna somente códigos allowlisted; nunca inclui descrição ou corpo bruto do provedor. */
export function mercadoPagoFailureDetails(response: Response, body: unknown) {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const error = payload.error;
  const providerRequestId = safeProviderCode(response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id"));
  const providerErrorCode = safeProviderCode(error) ?? safeProviderCode(payload.code) ?? errorCodeFrom(error);
  const providerCauseCodes = [payload.cause, payload.causes, payload.errors, payload.details]
    .flatMap((entry) => nestedCauseCodes(entry))
    .slice(0, 5);
  const retryDelay = retryAfterSeconds(response);

  return {
    provider: "mercado_pago",
    providerStatus: response.status,
    ...(providerRequestId ? { providerRequestId } : {}),
    ...(providerErrorCode ? { providerErrorCode } : {}),
    ...(retryDelay !== null ? { retryAfterSeconds: retryDelay } : {}),
    ...(providerCauseCodes.length ? { providerCauseCodes } : {})
  };
}
