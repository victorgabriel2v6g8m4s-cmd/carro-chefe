import { describe, expect, it } from "vitest";
import { initialFlowNode, nextFlowNode } from "./template-flow";
import type { SimulationNode } from "./template-types";

const nodes: SimulationNode[] = [
  { id: "welcome", name: "Boas-vindas", trigger: "início", templateKey: "welcome", response: "", nextNodeId: "", branches: [
    { id: "order", trigger: "botão", response: "Acompanhar pedido", nextNodeId: "status" },
    { id: "menu", trigger: "botão", response: "Ver cardápio", nextNodeId: "menu" }
  ] },
  { id: "status", name: "Status", trigger: "manual", templateKey: "status", response: "", nextNodeId: "" },
  { id: "menu", name: "Cardápio", trigger: "manual", templateKey: "menu", response: "", nextNodeId: "" }
];

describe("árvore de mensagens do simulador", () => {
  it("inicia no nó marcado como início", () => expect(initialFlowNode(nodes)?.id).toBe("welcome"));
  it("segue o ramo selecionado pelo texto do botão", () => expect(nextFlowNode(nodes, "welcome", "Acompanhar pedido", "botão")?.id).toBe("status"));
  it("não avança quando o gatilho não corresponde", () => expect(nextFlowNode(nodes, "welcome", "Outro", "texto")).toBeNull());
  it("aceita qualquer resposta quando esse gatilho foi configurado", () => {
    const anyReply = nodes.map((node) => node.id === "welcome" ? { ...node, branches: [{ id: "any", trigger: "qualquer resposta" as const, response: "", nextNodeId: "menu" }] } : node);
    expect(nextFlowNode(anyReply, "welcome", "Oi", "texto")?.id).toBe("menu");
  });
});
