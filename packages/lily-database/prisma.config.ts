import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "packages/lily-database/prisma/schema.prisma",
  migrations: {
    path: "packages/lily-database/prisma/migrations"
  },
  datasource: {
    url: process.env.LILY_DATABASE_URL ?? "file:./.runtime/lily-acai.db"
  }
});
