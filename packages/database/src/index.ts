import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/client/client";

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defaultDatabase = path.resolve(packageDir, "../../.runtime/carro-chefe.db");
const configuredUrl = process.env.DATABASE_URL ?? `file:${defaultDatabase}`;
const sqliteUrl = configuredUrl.startsWith("file:") ? configuredUrl.slice(5) : configuredUrl;

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalDatabase.prisma ?? new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: sqliteUrl })
});

if (process.env.NODE_ENV !== "production") globalDatabase.prisma = prisma;

export async function configureSqlite() {
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL");
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000");
}

export * from "../generated/client/client";
