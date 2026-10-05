import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

export const LILY_BUILD_BASELINE = Object.freeze({
  jsRawBytes: 479_360,
  jsGzipBytes: 126_140,
  cssRawBytes: 90_690,
  cssGzipBytes: 16_890
});

export const LILY_BUILD_BUDGET = Object.freeze({
  jsRawBytes: 620_000,
  jsGzipBytes: 165_000,
  cssRawBytes: 130_000,
  cssGzipBytes: 30_000,
  combinedGzipBytes: 190_000
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

  return {
    ...result,
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
