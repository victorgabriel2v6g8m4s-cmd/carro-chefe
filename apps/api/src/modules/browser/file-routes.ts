import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { ApiError } from "../../lib/errors";
import { requireTrustedRequest } from "../../security";
import { inlineTypes, readTextPreview, safeProjectFile, textExtensions } from "./file-access";
import { fileQuerySchema } from "./schemas";

export async function browserFileRoutes(app: FastifyInstance) {
  app.get("/api/v1/files/preview", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request) => {
    const file = await safeProjectFile(fileQuerySchema.parse(request.query).path);
    const extension = path.extname(file.real).toLowerCase();
    const base = { name: path.basename(file.real), path: file.relative, sizeBytes: file.stat.size, mimeType: inlineTypes[extension] ?? (textExtensions.has(extension) ? "text/plain" : "application/octet-stream") };
    if (textExtensions.has(extension)) return { ...base, kind: "text", text: await readTextPreview(file.real, file.stat.size) };
    if (inlineTypes[extension]) return { ...base, kind: extension === ".pdf" ? "pdf" : "image", contentUrl: `/api/v1/files/content?path=${encodeURIComponent(file.relative)}` };
    return { ...base, kind: "unsupported" };
  });

  app.get("/api/v1/files/content", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const file = await safeProjectFile(fileQuerySchema.parse(request.query).path);
    const mimeType = inlineTypes[path.extname(file.real).toLowerCase()];
    if (!mimeType) throw new ApiError(415, "Este tipo de arquivo não possui visualização inline.");
    reply.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(path.basename(file.real))}`);
    reply.header("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'");
    return reply.type(mimeType).send(await fs.readFile(file.real));
  });
}
