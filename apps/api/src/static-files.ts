import path from "node:path";
import { promises as fs } from "node:fs";
import { ApiError } from "./lib/errors";

const mimeTypes: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8"
};

function isContained(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function resolveStaticFile(root: string, requested: string) {
  if (!requested || requested.includes("\0")) throw new ApiError(400, "Caminho inválido.");
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, requested);
  if (!isContained(resolvedRoot, candidate)) throw new ApiError(403, "Caminho inválido.");
  const extension = path.extname(candidate).toLowerCase();
  const mimeType = mimeTypes[extension];
  if (!mimeType) throw new ApiError(415, "Tipo de arquivo estático não permitido.");
  return { resolvedRoot, candidate, mimeType };
}

export async function readStaticFile(root: string, requested: string) {
  const resolved = resolveStaticFile(root, requested);
  const [realRoot, realFile] = await Promise.all([fs.realpath(resolved.resolvedRoot), fs.realpath(resolved.candidate)]);
  if (!isContained(realRoot, realFile)) throw new ApiError(403, "Caminho inválido.");
  const stat = await fs.stat(realFile);
  if (!stat.isFile()) throw new ApiError(404, "Arquivo estático não encontrado.");
  return { body: await fs.readFile(realFile), mimeType: resolved.mimeType };
}
