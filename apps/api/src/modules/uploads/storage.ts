import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";

export const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");

export async function writeUpload(buffer: Buffer) {
  await fs.mkdir(uploadRoot, { recursive: true });
  const storageName = crypto.randomUUID();
  const destination = path.join(uploadRoot, storageName);
  await fs.writeFile(destination, buffer, { flag: "wx" });
  return { storageName, destination, sha256: crypto.createHash("sha256").update(buffer).digest("hex") };
}

export async function removeUpload(destination: string) {
  await fs.rm(destination, { force: true });
}

export async function readUpload(storageName: string) {
  if (!/^[0-9a-f-]{36}$/i.test(storageName)) throw new ApiError(403, "Identificador de armazenamento inválido.");
  const target = path.resolve(uploadRoot, storageName);
  const relative = path.relative(uploadRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new ApiError(403, "Caminho inválido.");
  return fs.readFile(target);
}
