import { describe, expect, it } from "vitest";
import { initialFlowNode, nextFlowNode } from "./template-flow";
import type { SimulationNode } from "./template-types";
import { journeyEvents } from "./journey-events";

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
  it("percorre a jornada completa do cardápio até a entrega pelos gatilhos da árvore", () => {
    const lifecycle: SimulationNode[] = [
      { id: "welcome", name: "Boas-vindas", trigger: "início", templateKey: "welcome", response: "", nextNodeId: "", branches: [{ id: "open-menu", trigger: journeyEvents[0].id, response: "", nextNodeId: journeyEvents[0].id }] },
      ...journeyEvents.map((event, index) => ({
      id: event.id,
      name: event.label,
      trigger: "manual",
      templateKey: event.id,
      response: "",
      nextNodeId: index + 1 < journeyEvents.length ? journeyEvents[index + 1].id : "",
      branches: index + 1 < journeyEvents.length ? [{ id: `${event.id}-next`, trigger: journeyEvents[index + 1].id, response: "", nextNodeId: journeyEvents[index + 1].id }] : [],
    }))];
    let active = lifecycle[0];
    for (const event of journeyEvents) {
      const next = nextFlowNode(lifecycle, active.id, event.id, event.id);
      expect(next?.id).toBe(event.id);
      active = next!;
    }
    expect(active.id).toBe("order_delivered");
  });
  it("não usa o próximo nó legado para avançar em um evento sem gatilho configurado", () => {
    expect(nextFlowNode([{ ...nodes[0], branches: [], nextNodeId: "status" }], "welcome", "order_created", "order_created")).toBeNull();
  });
});
