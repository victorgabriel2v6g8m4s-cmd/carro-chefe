import type { FastifyInstance } from "fastify";
import { artifactRoutes } from "./artifact-routes";
import { uploadContentRoutes } from "./content-routes";
import { directUploadRoutes } from "./upload-routes";

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(directUploadRoutes);
  await app.register(artifactRoutes);
  await app.register(uploadContentRoutes);
}
