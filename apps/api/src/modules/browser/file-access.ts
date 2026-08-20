import path from "node:path";
import { promises as fs } from "node:fs";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";

const blockedSegments = new Set([".git", ".runtime", "node_modules"]);
export const textExtensions = new Set([".txt", ".md", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".sql", ".prisma", ".csv"]);
export const inlineTypes: Readonly<Record<string, string>> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
const MAX_INLINE_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_BYTES = 300_000;

function isInsideProject(target: string) {
  const relative = path.relative(config.projectRoot, target);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function containsBlockedSegment(target: string) {
  return path.relative(config.projectRoot, target).split(path.sep).map((part) => part.toLowerCase())
    .some((part) => blockedSegments.has(part) || part.startsWith(".env"));
}

export async function safeProjectFile(input: string) {
  if (!input || input.includes("\0")) throw new ApiError(400, "Caminho inválido.");
  const candidate = path.isAbsolute(input) ? path.resolve(input) : path.resolve(config.projectRoot, input);
  if (!isInsideProject(candidate) || containsBlockedSegment(candidate)) {
    throw new ApiError(403, "O visualizador só abre arquivos públicos do projeto.");
  }
  const real = await fs.realpath(candidate).catch(() => null);
  if (!real || !isInsideProject(real) || containsBlockedSegment(real)) throw new ApiError(404, "Arquivo não encontrado.");
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new ApiError(400, "O caminho não aponta para um arquivo.");
  if (stat.size > MAX_INLINE_BYTES) throw new ApiError(413, "O arquivo excede o limite de visualização.");
  return { real, relative: path.relative(config.projectRoot, real).replaceAll("\\", "/"), stat };
}

export async function readTextPreview(filename: string, size: number) {
  const handle = await fs.open(filename, "r");
  try {
    const buffer = Buffer.alloc(Math.min(size, MAX_TEXT_BYTES));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}
