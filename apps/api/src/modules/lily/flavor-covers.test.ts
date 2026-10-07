import crypto from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureLilySqlite, lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { listLilyFlavorCovers, setLilyFlavorCover } from "./flavor-covers";

beforeAll(async () => {
  await configureLilySqlite();
});

const createdFlavorIds: string[] = [];
const createdMediaIds: string[] = [];

afterEach(async () => {
  if (createdFlavorIds.length > 0) {
    await lilyPrisma.lilyFlavorComponent.deleteMany({ where: { id: { in: createdFlavorIds.splice(0) } } });
  }
  if (createdMediaIds.length > 0) {
    await lilyPrisma.lilyMediaAsset.deleteMany({ where: { id: { in: createdMediaIds.splice(0) } } });
  }
});

async function createFlavor() {
  const id = `flavor-cover-${crypto.randomUUID()}`;
  createdFlavorIds.push(id);
  return lilyPrisma.lilyFlavorComponent.create({
    data: {
      id,
      slug: `flavor-${crypto.randomUUID()}`,
      name: "Sabor teste capa",
      status: "published",
      premium: false,
      tagsJson: "[]",
      portion300: 120,
      portion500: 200,
      priceModifier300: 0,
      priceModifier500: 0
    }
  });
}

async function createMedia(status = "active") {
  const id = `media-cover-${crypto.randomUUID()}`;
  createdMediaIds.push(id);
  return lilyPrisma.lilyMediaAsset.create({
    data: {
      id,
      storageName: `${id}.webp`,
      originalName: "sabor.webp",
      mime: "image/webp",
      size: 1234,
      sha256: crypto.createHash("sha256").update(id).digest("hex"),
      altText: "Foto do sabor",
      status
    }
  });
}

describe("capas dos sabores CookLily", () => {
  it("associa, lista e remove uma mídia ativa", async () => {
    const flavor = await createFlavor();
    const media = await createMedia();

    const cover = await setLilyFlavorCover(flavor.id, media.id);
    expect(cover).toMatchObject({ id: media.id, originalName: "sabor.webp" });

    const flavors = await listLilyFlavorCovers();
    expect(flavors.find((row) => row.id === flavor.id)?.cover).toMatchObject({
      id: media.id,
      url: `/api/v1/lily/public/media/${media.id}`
    });

    await setLilyFlavorCover(flavor.id, null);
    const afterRemoval = await listLilyFlavorCovers();
    expect(afterRemoval.find((row) => row.id === flavor.id)?.cover).toBeNull();
  });

  it("recusa mídia pausada", async () => {
    const flavor = await createFlavor();
    const media = await createMedia("paused");

    await expect(setLilyFlavorCover(flavor.id, media.id)).rejects.toMatchObject({
      statusCode: 400,
      details: { code: "LILY_FLAVOR_COVER_MEDIA_INVALID" }
    } satisfies Partial<ApiError>);
  });
});
