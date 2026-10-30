import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LILY_BUILD_BASELINE,
  LILY_BUILD_BUDGET,
  evaluateLilyBuildBudget,
  measureLilyBuildAssets
} from "./lily-build-budget.mjs";

test("budget registra redução do entrypoint e limita regressão dos assets totais", () => {
  assert.ok(LILY_BUILD_BUDGET.jsRawBytes < LILY_BUILD_BASELINE.jsRawBytes);
  assert.ok(LILY_BUILD_BUDGET.jsGzipBytes < LILY_BUILD_BASELINE.jsGzipBytes);
  assert.ok(LILY_BUILD_BUDGET.initialJsGzipBytes < LILY_BUILD_BASELINE.initialJsGzipBytes * 0.8);
  assert.ok(LILY_BUILD_BUDGET.largestJsChunkBytes < LILY_BUILD_BASELINE.largestJsChunkBytes * 0.5);
  assert.ok(LILY_BUILD_BUDGET.cssRawBytes > LILY_BUILD_BASELINE.cssRawBytes);
  assert.ok(LILY_BUILD_BUDGET.cssGzipBytes > LILY_BUILD_BASELINE.cssGzipBytes);
  assert.ok(LILY_BUILD_BUDGET.cssRawBytes < LILY_BUILD_BASELINE.cssRawBytes * 1.45);
  assert.ok(LILY_BUILD_BUDGET.combinedGzipBytes < (LILY_BUILD_BASELINE.jsGzipBytes + LILY_BUILD_BASELINE.cssGzipBytes) * 1.41);
});

test("avalia build dentro e fora do budget", () => {
  const within = {
    js: { files: 1, rawBytes: 500_000, gzipBytes: 130_000 },
    initialJs: { files: 1, rawBytes: 500_000, gzipBytes: 100_000 },
    largestJsChunkBytes: 250_000,
    css: { files: 1, rawBytes: 95_000, gzipBytes: 18_000 },
    combinedGzipBytes: 148_000
  };
  assert.deepEqual(evaluateLilyBuildBudget(within), []);

  const over = {
    js: { files: 1, rawBytes: 820_000, gzipBytes: 230_000 },
    initialJs: { files: 1, rawBytes: 820_000, gzipBytes: 120_000 },
    largestJsChunkBytes: 400_000,
    css: { files: 1, rawBytes: 184_000, gzipBytes: 37_000 },
    combinedGzipBytes: 270_000
  };
  const labels = evaluateLilyBuildBudget(over).map((item) => item.label);
  assert.deepEqual(labels, [
    "JS raw",
    "JS gzip",
    "JS inicial gzip",
    "Maior chunk JS",
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
    await mkdir(path.join(temp, ".vite"));
    await writeFile(path.join(assets, "index.js"), "console.log('cooklily');".repeat(100));
    await writeFile(path.join(assets, "index.css"), ".x{display:block}".repeat(100));
    await writeFile(path.join(assets, "photo.webp"), Buffer.alloc(200_000, 1));
    await writeFile(path.join(temp, ".vite", "manifest.json"), JSON.stringify({
      "index.html": { file: "assets/index.js", src: "index.html", isEntry: true, imports: [] }
    }));

    const measurement = await measureLilyBuildAssets(assets);
    assert.equal(measurement.js.files, 1);
    assert.equal(measurement.css.files, 1);
    assert.ok(measurement.js.rawBytes > 0);
    assert.ok(measurement.css.rawBytes > 0);
    assert.equal(measurement.initialJs.rawBytes, measurement.js.rawBytes);
    assert.equal(measurement.largestJsChunkBytes, measurement.js.rawBytes);
    assert.equal(
      measurement.combinedGzipBytes,
      measurement.js.gzipBytes + measurement.css.gzipBytes
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("handoff de agente é isolado e permanece abaixo de 2 KiB", async () => {
  const pagePath = path.resolve("apps/lily_acai/public/agent-auth.html");
  const page = await readFile(pagePath, "utf8");
  assert.ok(Buffer.byteLength(page) <= 2_048);
  assert.ok(page.indexOf("history.replaceState") < page.indexOf("fetch("));
  assert.match(page, /agent\/exchange/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|console\.log/);
});
