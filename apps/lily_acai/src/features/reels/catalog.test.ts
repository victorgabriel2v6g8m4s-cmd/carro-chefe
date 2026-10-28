import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLilyCatalog } from "../../api";
import { loadReelsCatalog } from "./catalog";

vi.mock("../../api", () => ({ getLilyCatalog: vi.fn() }));

const product = (id: string, status = "published", isAvailable = true, vipLocked = false) => ({
  id, status, isAvailable, vipLocked
}) as Awaited<ReturnType<typeof getLilyCatalog>>["products"][number];

describe("loadReelsCatalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads pages within the API limit and filters unavailable products", async () => {
    vi.mocked(getLilyCatalog)
      .mockResolvedValueOnce({ products: [product("first"), product("draft", "draft")], nextOffset: 40 } as Awaited<ReturnType<typeof getLilyCatalog>>)
      .mockResolvedValueOnce({ products: [product("second", "published", false, true)], nextOffset: null } as Awaited<ReturnType<typeof getLilyCatalog>>);

    await expect(loadReelsCatalog()).resolves.toEqual([product("first"), product("second", "published", false, true)]);
    expect(getLilyCatalog).toHaveBeenNthCalledWith(1, { limit: 40, offset: 0 });
    expect(getLilyCatalog).toHaveBeenNthCalledWith(2, { limit: 40, offset: 40 });
  });

  it("stops when the API returns a non-advancing offset", async () => {
    vi.mocked(getLilyCatalog).mockResolvedValue({ products: [product("first")], nextOffset: 0 } as Awaited<ReturnType<typeof getLilyCatalog>>);
    await expect(loadReelsCatalog()).resolves.toHaveLength(1);
    expect(getLilyCatalog).toHaveBeenCalledTimes(1);
  });
});
