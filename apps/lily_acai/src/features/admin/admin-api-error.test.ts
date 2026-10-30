import { describe, expect, it } from "vitest";
import { readAdminApiError } from "./admin-api-error";

describe("readAdminApiError", () => {
  it("shows validation paths and messages instead of hiding them", async () => {
    const response = new Response(JSON.stringify({
      error: "Entrada inválida.",
      details: [{ path: ["levels", 2, "iconMediaId"], message: "String must contain at most 80 character(s)" }]
    }), { status: 400, headers: { "Content-Type": "application/json" } });

    await expect(readAdminApiError(response)).resolves.toMatchObject({
      message: "Entrada inválida. levels → 2 → iconMediaId: String must contain at most 80 character(s)"
    });
  });

  it("keeps the API message when details are not structured validation issues", async () => {
    const response = new Response(JSON.stringify({ error: "Acesso negado." }), {
      status: 403, headers: { "Content-Type": "application/json" }
    });

    await expect(readAdminApiError(response)).resolves.toMatchObject({ message: "Acesso negado." });
  });
});
