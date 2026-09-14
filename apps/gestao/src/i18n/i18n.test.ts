import { describe, expect, it } from "vitest";
import { defaultLocale, getMessages } from ".";

describe("catálogo da Central Operacional", () => {
  it("expõe pt-BR com os domínios essenciais", () => {
    const catalog = getMessages(defaultLocale);
    expect(catalog.navigation.items.tasks).toBe("Tarefas");
    expect(catalog.notifications.title).toBe("Notificações");
    expect(catalog.executions.outcome.failures).toBe("Falhas");
  });
});
