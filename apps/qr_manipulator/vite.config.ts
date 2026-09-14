import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL(".",import.meta.url));
export default defineConfig({root,plugins:[react()],server:{host:"127.0.0.1",port:5180},build:{outDir:resolve(root,"dist"),emptyOutDir:true}});
