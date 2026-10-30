import { resolve } from "node:path";
import { build, loadConfigFromFile } from "vite";

const configPath = resolve("apps/lily_acai/vite.config.ts");
const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, configPath);
if (!loaded) throw new Error("Não foi possível carregar a configuração Vite da Lily.");

const analyzer = {
  name: "lily-bundle-module-report",
  generateBundle(_options, bundle) {
    const modules = new Map();
    for (const output of Object.values(bundle)) {
      if (output.type !== "chunk") continue;
      for (const [id, info] of Object.entries(output.modules)) {
        const prior = modules.get(id) ?? { raw: 0, chunks: new Set() };
        prior.raw += info.renderedLength;
        prior.chunks.add(output.fileName);
        modules.set(id, prior);
      }
    }
    const ranked = [...modules.entries()]
      .sort((a, b) => b[1].raw - a[1].raw)
      .slice(0, 40);
    console.log("Largest CookLily source contributions (minified JS bytes)");
    for (const [id, info] of ranked) {
      console.log(`${String(info.raw).padStart(8)} ${[...info.chunks].join(", ")} ${id}`);
    }
  }
};

await build({
  ...loaded.config,
  configFile: false,
  plugins: [...loaded.config.plugins, analyzer],
  build: { ...loaded.config.build, write: false }
});
