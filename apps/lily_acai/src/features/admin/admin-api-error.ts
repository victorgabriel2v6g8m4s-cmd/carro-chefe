type ApiErrorResponse = {
  error?: unknown;
  details?: unknown;
};

type ValidationIssue = {
  path?: unknown;
  message?: unknown;
};

/** Preserves safe field paths from API validation errors instead of hiding them behind a generic message. */
export async function readAdminApiError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as ApiErrorResponse | null;
  const message = typeof body?.error === "string" ? body.error : "Não foi possível concluir a solicitação.";
  if (!Array.isArray(body?.details)) return new Error(message);

  const issues = body.details.filter((issue): issue is ValidationIssue => Boolean(issue) && typeof issue === "object")
    .slice(0, 5)
    .map((issue) => {
      const path = Array.isArray(issue.path)
        ? issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number").join(" → ")
        : "";
      const reason = typeof issue.message === "string" ? issue.message : "Valor inválido.";
      return `${path || "Formulário"}: ${reason}`;
    });
  if (!issues.length) return new Error(message);
  const remaining = body.details.length - issues.length;
  return new Error(`${message} ${issues.join("; ")}${remaining > 0 ? `; e mais ${remaining} erro(s)` : ""}`);
}
