import { describe, expect, it } from "vitest";
import { emptyAudienceRule, emptyMissionInstruction, emptyMissionReward, parseMissionRows } from "./types";

describe("dados do editor de missões", () => {
  it("inicia etapas, regras e recompensas com valores editáveis válidos", () => {
    expect(emptyMissionInstruction()).toEqual({ title: "", body: "", required: false, mediaId: null });
    expect(emptyMissionReward()).toEqual({ kind: "product", id: "", quantity: 1 });
    expect(emptyAudienceRule()).toEqual({ operator: "and", field: "class", value: "vip" });
  });

  it("carrega JSON legado sem quebrar o editor quando houver formato antigo ou corrompido", () => {
    expect(parseMissionRows<{ title: string }>("[{\"title\":\"Publicar story\"}]", [])).toEqual([{ title: "Publicar story" }]);
    expect(parseMissionRows("{invalid", [{ title: "fallback" }])).toEqual([{ title: "fallback" }]);
  });
});
