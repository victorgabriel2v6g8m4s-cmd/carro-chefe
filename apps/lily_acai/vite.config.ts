import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  envDir: path.resolve(import.meta.dirname, "../.."),
  base: "/lilyacai/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5175,
    proxy: {
      "/api": "http://127.0.0.1:4173"
    }
  }
});
