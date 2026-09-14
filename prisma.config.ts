import { defineConfig } from "prisma/config";

export default defineConfig({
  // Prisma 7 combina todos os arquivos .prisma deste diretório. Mantemos o
  // schema principal intacto e separamos os modelos do pré-lançamento por domínio.
  schema: "packages/database/prisma",
  migrations: {
    path: "packages/database/prisma/migrations",
    seed: "tsx packages/database/src/seed.ts"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./.runtime/carro-chefe.db"
  }
});
