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

/** Retorna somente códigos allowlisted; nunca inclui descrição ou corpo bruto do provedor. */
export function mercadoPagoFailureDetails(response: Response, body: unknown) {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const providerRequestId = safeProviderCode(response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id"));
  const providerErrorCode = safeProviderCode(payload.error) ?? safeProviderCode(payload.code);
  const causes = Array.isArray(payload.cause) ? payload.cause : [];
  const providerCauseCodes = causes
    .map((cause) => cause && typeof cause === "object" ? safeProviderCode((cause as Record<string, unknown>).code) : undefined)
    .filter((code): code is string => Boolean(code))
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
