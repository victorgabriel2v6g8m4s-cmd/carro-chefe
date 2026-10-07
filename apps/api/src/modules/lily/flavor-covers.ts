import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";

const idSchema = z.string().trim().min(1).max(120);

type FlavorCoverRow = {
  flavorId: string;
  mediaId: string;
  originalName: string;
  altText: string;
  status: string;
};

function mediaUrl(mediaId: string) {
  return `/api/v1/lily/public/media/${encodeURIComponent(mediaId)}`;
}

async function coverRows() {
  return lilyPrisma.$queryRaw<FlavorCoverRow[]>`
    SELECT
      cover."flavorId" AS "flavorId",
      cover."mediaId" AS "mediaId",
      media."originalName" AS "originalName",
      media."altText" AS "altText",
      media."status" AS "status"
    FROM "LilyFlavorCover" cover
    INNER JOIN "LilyMediaAsset" media ON media."id" = cover."mediaId"
  `;
}

export async function listLilyFlavorCovers(options: { publicOnly?: boolean } = {}) {
  const flavors = await lilyPrisma.lilyFlavorComponent.findMany({
    where: options.publicOnly ? { status: "published" } : undefined,
    orderBy: { name: "asc" }
  });
  const rows = await coverRows();
  const byFlavor = new Map(rows.map((row) => [row.flavorId, row]));

  return flavors.map((flavor) => {
    const row = byFlavor.get(flavor.id);
    const cover = row && row.status === "active"
      ? {
          id: row.mediaId,
          url: mediaUrl(row.mediaId),
          originalName: row.originalName,
          altText: row.altText
        }
      : null;
    return {
      id: flavor.id,
      slug: flavor.slug,
      name: flavor.name,
      status: flavor.status,
      premium: flavor.premium,
      cover
    };
  });
}

export async function setLilyFlavorCover(flavorId: string, mediaId: string | null) {
  const flavor = await lilyPrisma.lilyFlavorComponent.findUnique({ where: { id: flavorId } });
  if (!flavor) throw new ApiError(404, "Sabor não encontrado.", { code: "LILY_FLAVOR_NOT_FOUND" });

  if (mediaId === null) {
    await lilyPrisma.$executeRaw`DELETE FROM "LilyFlavorCover" WHERE "flavorId" = ${flavorId}`;
    return null;
  }

  const media = await lilyPrisma.lilyMediaAsset.findUnique({ where: { id: mediaId } });
  if (!media || media.status !== "active") {
    throw new ApiError(400, "A foto selecionada não está disponível.", {
      code: "LILY_FLAVOR_COVER_MEDIA_INVALID"
    });
  }

  await lilyPrisma.$executeRaw`
    INSERT INTO "LilyFlavorCover" ("flavorId", "mediaId", "createdAt", "updatedAt")
    VALUES (${flavorId}, ${mediaId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("flavorId") DO UPDATE SET
      "mediaId" = excluded."mediaId",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  return {
    id: media.id,
    url: mediaUrl(media.id),
    originalName: media.originalName,
    altText: media.altText
  };
}

export async function lilyFlavorCoverRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/flavor-covers", async () => ({
    flavors: await listLilyFlavorCovers({ publicOnly: true })
  }));

  app.get("/api/v1/lily/admin/flavor-covers", async (request) => {
    await requireLilyStaff(request);
    return { flavors: await listLilyFlavorCovers() };
  });

  app.put("/api/v1/lily/admin/flavors/:id/cover", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const { mediaId } = z.object({ mediaId: idSchema.nullable() }).strict().parse(request.body);
    const cover = await setLilyFlavorCover(id, mediaId);
    await auditLilyAdmin(context.user.id, "update-cover", "flavor", id, { mediaId });
    return { flavorId: id, cover };
  });
}
