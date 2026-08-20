import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertLoopbackBinding, isLoopbackHost } from "./config";
import { resolveStaticFile } from "./static-files";

describe("fronteira do servidor local", () => {
  it("permite somente hosts loopback enquanto não existe autenticação real", () => {
    for (const host of ["127.0.0.1", "localhost", "::1", "[::1]"]) {
      expect(isLoopbackHost(host)).toBe(true);
      expect(() => assertLoopbackBinding(host)).not.toThrow();
    }
    for (const host of ["0.0.0.0", "::", "192.168.0.10", "carrochefe.com"]) {
      expect(isLoopbackHost(host)).toBe(false);
      expect(() => assertLoopbackBinding(host)).toThrow(/autenticação server-side/);
    }
  });

  it("rejeita traversal e colisão com diretório de prefixo semelhante", () => {
    const root = path.resolve("apps", "site", "dist");
    expect(resolveStaticFile(root, "assets/index.js").candidate).toBe(path.join(root, "assets", "index.js"));
    expect(() => resolveStaticFile(root, "../segredo.js")).toThrow();
    expect(() => resolveStaticFile(root, path.join("..", `${path.basename(root)}-evil`, "segredo.js"))).toThrow();
    expect(() => resolveStaticFile(root, path.resolve(path.dirname(root), `${path.basename(root)}-evil`, "segredo.js"))).toThrow();
  });

  it("serve apenas extensões estáticas explicitamente permitidas", () => {
    const root = path.resolve("apps", "gestao", "dist");
    expect(resolveStaticFile(root, "index.html").mimeType).toBe("text/html; charset=utf-8");
    expect(() => resolveStaticFile(root, "../dist-evil/config.env")).toThrow();
    expect(() => resolveStaticFile(root, "dump.sqlite")).toThrow();
  });
});
