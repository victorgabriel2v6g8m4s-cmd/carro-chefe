import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const LILY_AGENT_SIGNATURE_NAMESPACE = "cooklily-agent-auth";

export function parseLilyAgentPublicKey(value: string) {
  const [type, encoded] = value.trim().split(/\s+/, 3);
  if (type !== "ssh-ed25519" || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const blob = Buffer.from(encoded, "base64");
  if (blob.length !== 51 || blob.readUInt32BE(0) !== 11 || blob.subarray(4, 15).toString() !== type
    || blob.readUInt32BE(15) !== 32 || blob.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) return null;
  const publicKey = `${type} ${encoded}`;
  const fingerprint = `SHA256:${crypto.createHash("sha256").update(blob).digest("base64").replace(/=+$/, "")}`;
  return { publicKey, fingerprint };
}

export function verifyLilyAgentSignature(publicKey: string, signature: string, message: string) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lily-agent-verify-"));
  const allowedSigners = path.join(directory, "allowed_signers");
  const signaturePath = path.join(directory, "challenge.sig");
  try {
    writeFileSync(allowedSigners, `cooklily-agent ${publicKey}\n`, { encoding: "utf8", mode: 0o600 });
    writeFileSync(signaturePath, signature, { encoding: "utf8", mode: 0o600 });
    execFileSync("ssh-keygen", [
      "-Y", "verify", "-f", allowedSigners, "-I", "cooklily-agent",
      "-n", LILY_AGENT_SIGNATURE_NAMESPACE, "-s", signaturePath
    ], { input: message, stdio: ["pipe", "ignore", "ignore"], timeout: 3000, windowsHide: true });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
