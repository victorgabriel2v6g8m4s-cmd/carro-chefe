import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeLineEndings } from "./core.mjs";

describe("normalização de finais de linha da política", () => {
  it("gera o mesmo texto canônico para arquivos LF e CRLF", () => {
    assert.equal(normalizeLineEndings("regra 1\r\nregra 2\r\n"), "regra 1\nregra 2\n");
    assert.equal(normalizeLineEndings("regra 1\nregra 2\n"), "regra 1\nregra 2\n");
  });
});
