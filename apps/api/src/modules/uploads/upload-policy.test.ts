import { describe, expect, it } from "vitest";
import { normalizeUploadName, validateUpload } from "./upload-policy";

describe("política de uploads", () => {
  it("aceita texto UTF-8 e JSON válido com extensão coerente", () => {
    expect(validateUpload(Buffer.from("Contexto operacional.", "utf8"), "text/plain", "contexto.txt")).toMatchObject({ originalName: "contexto.txt" });
    expect(validateUpload(Buffer.from('{"status":"ok"}', "utf8"), "application/json", "resultado.json")).toMatchObject({ mimeType: "application/json" });
  });

  it("rejeita conteúdo forjado, JSON inválido e extensão divergente", () => {
    expect(() => validateUpload(Buffer.from("não é imagem"), "image/png", "foto.png")).toThrow();
    expect(() => validateUpload(Buffer.from("{inválido}"), "application/json", "dados.json")).toThrow();
    expect(() => validateUpload(Buffer.from("texto"), "text/plain", "execucao.exe")).toThrow();
  });

  it("normaliza nomes sem permitir traversal, controles ou marcadores bidi", () => {
    expect(normalizeUploadName("../../\u202Esegredo.txt")).toBe("_segredo.txt");
    expect(normalizeUploadName("pasta\\relatório?.txt")).toBe("relatório_.txt");
  });

  it("faz inspeção básica da estrutura OOXML", () => {
    const validDocx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml word/document.xml")]);
    expect(validateUpload(validDocx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "briefing.docx")).toMatchObject({ originalName: "briefing.docx" });
    const wrongFamily = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml xl/workbook.xml")]);
    expect(() => validateUpload(wrongFamily, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "briefing.docx")).toThrow();
  });
});
