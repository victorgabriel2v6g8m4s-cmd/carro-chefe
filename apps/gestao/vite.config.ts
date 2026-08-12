import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  base: "/gestao/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5174, proxy: { "/api": "http://127.0.0.1:4173", "/assets/brand": "http://127.0.0.1:4173" } }
});
