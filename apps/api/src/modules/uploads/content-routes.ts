import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../../lib/errors";
import { requireTrustedRequest } from "../../security";
import { readUpload } from "./storage";
import { findUpload } from "./repository";

const uploadParamsSchema = z.object({ uploadId: z.string().trim().min(1).max(200) }).strict();
const contentQuerySchema = z.object({ disposition: z.enum(["inline", "attachment"]).optional() }).strict();

export async function uploadContentRoutes(app: FastifyInstance) {
  app.get("/api/v1/uploads/:uploadId", { preHandler: requireTrustedRequest }, async (request) => {
    const { uploadId } = uploadParamsSchema.parse(request.params);
    const upload = await findUpload(uploadId);
    if (!upload) throw new ApiError(404, "Arquivo não encontrado.");
    return upload;
  });

  app.get("/api/v1/uploads/:uploadId/content", { preHandler: requireTrustedRequest, config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { uploadId } = uploadParamsSchema.parse(request.params);
    const query = contentQuerySchema.parse(request.query);
    const upload = await findUpload(uploadId);
    if (!upload) throw new ApiError(404, "Arquivo não encontrado.");
    const disposition = query.disposition === "inline" ? "inline" : "attachment";
    reply.header("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`);
    if (disposition === "inline") reply.header("Content-Security-Policy", "sandbox; default-src 'none'");
    return reply.type(upload.mimeType).send(await readUpload(upload.storageName));
  });
}
