import { ApiError } from "../../lib/errors";

type MultipartField = { value?: unknown };

export function multipartField(fields: unknown, name: string, maximumLength = 200) {
  if (!fields || typeof fields !== "object") return undefined;
  const candidate = (fields as Record<string, unknown>)[name];
  if (!candidate || typeof candidate !== "object") return undefined;
  const value = (candidate as MultipartField).value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length > maximumLength) throw new ApiError(400, `O campo ${name} excede o limite permitido.`);
  return normalized;
}
