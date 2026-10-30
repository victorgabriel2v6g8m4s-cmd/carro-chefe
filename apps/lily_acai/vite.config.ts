import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  envDir: path.resolve(import.meta.dirname, "../.."),
  base: "/lilyacai/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react$/, replacement: "preact/compat" },
      { find: /^react\/jsx-runtime$/, replacement: "preact/jsx-runtime" },
      { find: /^react\/jsx-dev-runtime$/, replacement: "preact/jsx-runtime" },
      { find: /^react-dom\/client$/, replacement: "preact/compat/client" },
      { find: /^react-dom$/, replacement: "preact/compat" }
    ]
  },
  build: {
    outDir: "dist",
    manifest: true,
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "vendor", test: /[\\/]node_modules[\\/]/, priority: 10 },
            { name: "shared-app", test: /[\\/]apps[\\/]lily_acai[\\/]src[\\/]/, minShareCount: 2, priority: 1 }
          ]
        }
      }
    }
  },
  server: {
    port: 5175,
    proxy: {
      "/api": "http://127.0.0.1:4173"
    }
  }
});
