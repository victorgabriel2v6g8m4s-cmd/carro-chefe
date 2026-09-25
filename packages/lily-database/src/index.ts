import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/client/client";

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defaultDatabase = path.resolve(packageDir, "../../.runtime/lily-acai.db");
const configuredUrl = process.env.LILY_DATABASE_URL ?? `file:${defaultDatabase}`;
const sqliteUrl = configuredUrl.startsWith("file:") ? configuredUrl.slice(5) : configuredUrl;

const globalDatabase = globalThis as unknown as { lilyPrisma?: PrismaClient };

export const lilyPrisma = globalDatabase.lilyPrisma ?? new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: sqliteUrl })
});

if (process.env.NODE_ENV !== "production") globalDatabase.lilyPrisma = lilyPrisma;

export async function configureLilySqlite() {
  await lilyPrisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  await lilyPrisma.$executeRawUnsafe("PRAGMA journal_mode = WAL");
  await lilyPrisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000");
}

export * from "../generated/client/client";
