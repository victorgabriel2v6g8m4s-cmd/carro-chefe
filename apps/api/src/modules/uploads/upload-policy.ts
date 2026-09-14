import path from "node:path";
import { ApiError } from "../../lib/errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const mimeExtensions = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt", ".md"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"]
} as const;

export type AllowedMimeType = keyof typeof mimeExtensions;
export const allowedMimeTypes = new Set<string>(Object.keys(mimeExtensions));

const startsWith = (buffer: Buffer, signature: readonly number[]) => signature.every((byte, index) => buffer[index] === byte);
const containsAscii = (buffer: Buffer, value: string) => buffer.includes(Buffer.from(value, "ascii"));

function isUtf8Text(buffer: Buffer) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return !text.includes("\0");
  } catch {
    return false;
  }
}

function isJson(buffer: Buffer) {
  if (!isUtf8Text(buffer)) return false;
  try { JSON.parse(buffer.toString("utf8")); return true; } catch { return false; }
}

function isOoxml(buffer: Buffer, requiredEntry: string) {
  return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])
    && containsAscii(buffer, "[Content_Types].xml")
    && containsAscii(buffer, requiredEntry);
}

const contentValidators: Record<AllowedMimeType, (buffer: Buffer) => boolean> = {
  "image/png": (buffer) => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]) && buffer.lastIndexOf(Buffer.from([0xff, 0xd9])) >= buffer.length - 32,
  "image/webp": (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
  "image/gif": (buffer) => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")),
  "video/mp4": (buffer) => buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp",
  "video/webm": (buffer) => startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]),
  "audio/mpeg": (buffer) => startsWith(buffer, [0x49, 0x44, 0x33]) || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
  "audio/wav": (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE",
  "audio/ogg": (buffer) => buffer.subarray(0, 4).toString("ascii") === "OggS",
  "application/pdf": (buffer) => startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]) && containsAscii(buffer.subarray(Math.max(0, buffer.length - 1_024)), "%%EOF"),
  "text/plain": isUtf8Text,
  "text/csv": isUtf8Text,
  "application/json": isJson,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (buffer) => isOoxml(buffer, "word/document.xml"),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (buffer) => isOoxml(buffer, "xl/workbook.xml"),
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": (buffer) => isOoxml(buffer, "ppt/presentation.xml")
};

export function normalizeUploadName(input: string) {
  const leaf = input.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const cleaned = leaf.normalize("NFKC").replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>:"/\\|?*]/g, "_").trim().replace(/[. ]+$/g, "");
  if (!cleaned) return "arquivo";
  if (cleaned.length <= 240) return cleaned;
  const extension = path.extname(cleaned).slice(0, 20);
  return `${cleaned.slice(0, Math.max(1, 240 - extension.length))}${extension}`;
}

export function mimeTypeForFilename(filename: string): AllowedMimeType | null {
  const extension = path.extname(filename).toLowerCase();
  const match = Object.entries(mimeExtensions).find(([, extensions]) => (extensions as readonly string[]).includes(extension));
  return (match?.[0] as AllowedMimeType | undefined) ?? null;
}

export function validateUpload(buffer: Buffer, mimeType: string, originalName: string) {
  if (!buffer.length) throw new ApiError(400, "O arquivo está vazio.", { code: "UPLOAD_EMPTY" });
  if (buffer.length > MAX_UPLOAD_BYTES) throw new ApiError(413, "O arquivo excede 10 MB.", { code: "UPLOAD_TOO_LARGE" });
  if (!allowedMimeTypes.has(mimeType)) throw new ApiError(415, "Tipo de arquivo não permitido.", { code: "UPLOAD_MIME_FORBIDDEN" });
  const normalizedName = normalizeUploadName(originalName);
  const expectedMime = mimeTypeForFilename(normalizedName);
  if (expectedMime !== mimeType) throw new ApiError(415, "A extensão do arquivo não corresponde ao tipo informado.", { code: "UPLOAD_EXTENSION_MISMATCH" });
  if (!contentValidators[mimeType as AllowedMimeType](buffer)) {
    throw new ApiError(415, "O conteúdo do arquivo não corresponde ao tipo informado.", { code: "UPLOAD_CONTENT_MISMATCH" });
  }
  return { originalName: normalizedName, mimeType: mimeType as AllowedMimeType };
}
