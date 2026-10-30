import { describe, expect, it } from "vitest";
import { sanitizeLilySvg } from "./safe-svg";

describe("sanitização de SVG para ícones CookLily", () => {
  it("mantém paths e gradientes autocontidos", () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="gold"><stop offset="0%" stop-color="#c49558"/></linearGradient></defs><path fill="url(#gold)" d="M12 1L2 22h20z"/></svg>';
    expect(sanitizeLilySvg(source)).toContain('fill="url(#gold)"');
    expect(sanitizeLilySvg(source)).toContain("<path");
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)"><path d="M0 0"/></svg>',
    '<svg><image href="https://example.com/a.png"/></svg>',
    '<!DOCTYPE svg><svg/>',
    '<svg><path fill="url(https://example.com/a.svg#x)" d="M0 0"/></svg>'
  ])("rejeita conteúdo ativo ou externo: %s", (source) => {
    expect(() => sanitizeLilySvg(source)).toThrow();
  });

  it("rejeita SVG maior que 1 MB", () => {
    expect(() => sanitizeLilySvg(`<svg>${" ".repeat(1024 * 1024)}</svg>`)).toThrow("1 MB");
  });
});
