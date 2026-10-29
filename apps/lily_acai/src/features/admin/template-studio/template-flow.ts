import type { SimulationNode } from "./template-types";

export function initialFlowNode(nodes: SimulationNode[]) {
  return nodes.find((node) => node.trigger === "início") ?? null;
}

export function nextFlowNode(nodes: SimulationNode[], activeId: string, input: string, inputType: "texto" | "botão" | "manual") {
  const active = nodes.find((node) => node.id === activeId);
  if (!active) return null;
  const normalized = input.trim().toLocaleLowerCase();
  const branch = active.branches?.find((item) => item.trigger === "qualquer resposta" || (item.trigger === inputType && (
    item.trigger === "texto"
      ? normalized.includes(item.response.trim().toLocaleLowerCase())
      : item.response.trim().toLocaleLowerCase() === normalized)
  ));
  const legacyMatch = active.branches?.length ? undefined : active.nextNodeId;
  const destinationId = branch?.nextNodeId ?? legacyMatch;
  return nodes.find((node) => node.id === destinationId) ?? null;
}
