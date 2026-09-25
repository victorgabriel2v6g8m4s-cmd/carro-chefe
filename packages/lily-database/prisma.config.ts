import path from "node:path";
import { defineConfig } from "prisma/config";

function sqliteUrl(input: string | undefined) {
  const configured = input ?? "file:./.runtime/lily-acai.db";
  if (!configured.startsWith("file:")) return configured;
  const rawPath = configured.slice(5);
  if (path.isAbsolute(rawPath)) return configured;
  const absolute = path.resolve(process.cwd(), rawPath).split(path.sep).join("/");
  return `file:${absolute}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: sqliteUrl(process.env.LILY_DATABASE_URL)
  }
});
