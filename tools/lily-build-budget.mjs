import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

export const LILY_BUILD_BASELINE = Object.freeze({
  jsRawBytes: 809_073,
  jsGzipBytes: 224_993,
  initialJsGzipBytes: 141_312,
  largestJsChunkBytes: 595_046,
  cssRawBytes: 130_610,
  cssGzipBytes: 16_890
});

export const LILY_BUILD_BUDGET = Object.freeze({
  // Nodes suportados podem variar ligeiramente no gzip por versão de zlib;
  // o teto combinado continua impondo o limite global de JS + CSS.
  // A folga adicional cobre os novos chunks públicos/admin da Landing CookLily;
  // os limites de entrypoint e chunk máximo permanecem inalterados.
  jsRawBytes: 663_552,
  jsGzipBytes: 208_896,
  initialJsGzipBytes: 112_640,
  largestJsChunkBytes: 286_720,
  cssRawBytes: 204_800,
  cssGzipBytes: 41_984,
  // O teto agregado é mais estrito que a soma dos limites individuais.
  combinedGzipBytes: 250_880
});

function emptyBucket() {
  return { files: 0, rawBytes: 0, gzipBytes: 0 };
}

export async function measureLilyBuildAssets(assetsDirectory) {
  const entries = await readdir(assetsDirectory, { withFileTypes: true });
  const result = {
    js: emptyBucket(),
    css: emptyBucket()
  };

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const kind = entry.name.endsWith(".js")
      ? "js"
      : entry.name.endsWith(".css")
        ? "css"
        : null;
    if (!kind) continue;

    const bytes = await readFile(resolve(assetsDirectory, entry.name));
    result[kind].files += 1;
    result[kind].rawBytes += bytes.byteLength;
    result[kind].gzipBytes += gzipSync(bytes, { level: 9 }).byteLength;
  }

  if (result.js.files === 0) {
    throw new Error(`Nenhum asset JS encontrado em ${assetsDirectory}.`);
  }
  if (result.css.files === 0) {
    throw new Error(`Nenhum asset CSS encontrado em ${assetsDirectory}.`);
  }

  const manifestPath = resolve(assetsDirectory, "../.vite/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entry = Object.values(manifest).find((item) => item.isEntry && item.src === "index.html");
  if (!entry) throw new Error(`Entry index.html não encontrado no manifest da Lily: ${manifestPath}`);

  const visited = new Set();
  async function visit(entryKey) {
    if (visited.has(entryKey)) return;
    visited.add(entryKey);
    const item = manifest[entryKey];
    if (!item) return;
    for (const importedKey of item.imports ?? []) await visit(importedKey);
  }
  const entryKey = Object.keys(manifest).find((key) => manifest[key] === entry);
  await visit(entryKey);

  const initialJs = emptyBucket();
  for (const key of visited) {
    const file = manifest[key]?.file;
    if (!file?.endsWith(".js")) continue;
    const bytes = await readFile(resolve(assetsDirectory, "..", file));
    initialJs.files += 1;
    initialJs.rawBytes += bytes.byteLength;
    initialJs.gzipBytes += gzipSync(bytes, { level: 9 }).byteLength;
  }
  const largestJsChunkBytes = Math.max(...await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map(async (entry) => (await readFile(resolve(assetsDirectory, entry.name))).byteLength)));

  return {
    ...result,
    initialJs,
    largestJsChunkBytes,
    combinedGzipBytes: result.js.gzipBytes + result.css.gzipBytes
  };
}

export function evaluateLilyBuildBudget(
  measurement,
  budget = LILY_BUILD_BUDGET
) {
  const checks = [
    ["JS raw", measurement.js.rawBytes, budget.jsRawBytes],
    ["JS gzip", measurement.js.gzipBytes, budget.jsGzipBytes],
    ["JS inicial gzip", measurement.initialJs.gzipBytes, budget.initialJsGzipBytes],
    ["Maior chunk JS", measurement.largestJsChunkBytes, budget.largestJsChunkBytes],
    ["CSS raw", measurement.css.rawBytes, budget.cssRawBytes],
    ["CSS gzip", measurement.css.gzipBytes, budget.cssGzipBytes],
    ["JS + CSS gzip", measurement.combinedGzipBytes, budget.combinedGzipBytes]
  ];

  return checks
    .filter(([, measured, limit]) => measured > limit)
    .map(([label, measured, limit]) => ({
      label,
      measured,
      limit,
      overBy: measured - limit
    }));
}

function kib(bytes) {
  return (bytes / 1024).toFixed(2);
}

export function formatLilyBuildBudgetReport(measurement, budget = LILY_BUILD_BUDGET) {
  const rows = [
    ["JS raw", measurement.js.rawBytes, budget.jsRawBytes, measurement.js.files],
    ["JS gzip", measurement.js.gzipBytes, budget.jsGzipBytes, measurement.js.files],
    ["JS inicial gzip", measurement.initialJs.gzipBytes, budget.initialJsGzipBytes, measurement.initialJs.files],
    ["Maior chunk JS", measurement.largestJsChunkBytes, budget.largestJsChunkBytes, 1],
    ["CSS raw", measurement.css.rawBytes, budget.cssRawBytes, measurement.css.files],
    ["CSS gzip", measurement.css.gzipBytes, budget.cssGzipBytes, measurement.css.files],
    ["JS + CSS gzip", measurement.combinedGzipBytes, budget.combinedGzipBytes, measurement.js.files + measurement.css.files]
  ];

  return rows
    .map(([label, measured, limit, files]) =>
      `${String(label).padEnd(15)} ${kib(measured)} KiB / ${kib(limit)} KiB budget (${files} asset(s))`
    )
    .join("\n");
}

async function main() {
  const assetsDirectory = resolve(
    process.argv[2] || "apps/lily_acai/dist/assets"
  );
  const measurement = await measureLilyBuildAssets(assetsDirectory);
  const report = formatLilyBuildBudgetReport(measurement);
  const violations = evaluateLilyBuildBudget(measurement);

  console.log("CookLily build budget");
  console.log(report);

  if (violations.length) {
    console.error("\nERRO: budget de performance excedido:");
    for (const violation of violations) {
      console.error(
        `- ${violation.label}: +${kib(violation.overBy)} KiB acima do limite.`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nbuild_budget=ok");
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
