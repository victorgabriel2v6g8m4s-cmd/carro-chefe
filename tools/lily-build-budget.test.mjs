import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LILY_BUILD_BASELINE,
  LILY_BUILD_BUDGET,
  evaluateLilyBuildBudget,
  measureLilyBuildAssets
} from "./lily-build-budget.mjs";

test("budget mantém folga controlada acima da baseline real validada", () => {
  assert.ok(LILY_BUILD_BUDGET.jsRawBytes > LILY_BUILD_BASELINE.jsRawBytes);
  assert.ok(LILY_BUILD_BUDGET.jsGzipBytes > LILY_BUILD_BASELINE.jsGzipBytes);
  assert.ok(LILY_BUILD_BUDGET.cssRawBytes > LILY_BUILD_BASELINE.cssRawBytes);
  assert.ok(LILY_BUILD_BUDGET.cssGzipBytes > LILY_BUILD_BASELINE.cssGzipBytes);

  assert.ok(LILY_BUILD_BUDGET.jsRawBytes < LILY_BUILD_BASELINE.jsRawBytes * 1.35);
  assert.ok(LILY_BUILD_BUDGET.jsGzipBytes < LILY_BUILD_BASELINE.jsGzipBytes * 1.35);
  assert.ok(LILY_BUILD_BUDGET.cssRawBytes < LILY_BUILD_BASELINE.cssRawBytes * 1.45);
  assert.ok(LILY_BUILD_BUDGET.combinedGzipBytes < (LILY_BUILD_BASELINE.jsGzipBytes + LILY_BUILD_BASELINE.cssGzipBytes) * 1.35);
});

test("avalia build dentro e fora do budget", () => {
  const within = {
    js: { files: 1, rawBytes: 500_000, gzipBytes: 130_000 },
    css: { files: 1, rawBytes: 95_000, gzipBytes: 18_000 },
    combinedGzipBytes: 148_000
  };
  assert.deepEqual(evaluateLilyBuildBudget(within), []);

  const over = {
    js: { files: 1, rawBytes: 700_000, gzipBytes: 180_000 },
    css: { files: 1, rawBytes: 140_000, gzipBytes: 35_000 },
    combinedGzipBytes: 215_000
  };
  const labels = evaluateLilyBuildBudget(over).map((item) => item.label);
  assert.deepEqual(labels, [
    "JS raw",
    "JS gzip",
    "CSS raw",
    "CSS gzip",
    "JS + CSS gzip"
  ]);
});

test("mede apenas JS/CSS existentes no diretório de assets", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "lily-build-budget-"));
  const assets = path.join(temp, "assets");
  try {
    await mkdir(assets);
    await writeFile(path.join(assets, "index.js"), "console.log('cooklily');".repeat(100));
    await writeFile(path.join(assets, "index.css"), ".x{display:block}".repeat(100));
    await writeFile(path.join(assets, "photo.webp"), Buffer.alloc(200_000, 1));

    const measurement = await measureLilyBuildAssets(assets);
    assert.equal(measurement.js.files, 1);
    assert.equal(measurement.css.files, 1);
    assert.ok(measurement.js.rawBytes > 0);
    assert.ok(measurement.css.rawBytes > 0);
    assert.equal(
      measurement.combinedGzipBytes,
      measurement.js.gzipBytes + measurement.css.gzipBytes
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
