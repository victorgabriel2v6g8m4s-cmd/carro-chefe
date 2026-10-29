import type { SimulationNode } from "./template-types";
import type { JourneyEventId } from "./journey-events";

export function initialFlowNode(nodes: SimulationNode[]) {
  return nodes.find((node) => node.trigger === "início") ?? null;
}

export function nextFlowNode(nodes: SimulationNode[], activeId: string, input: string, inputType: "texto" | "botão" | "manual" | JourneyEventId) {
  const active = nodes.find((node) => node.id === activeId);
  if (!active) return null;
  const normalized = input.trim().toLocaleLowerCase();
  const isJourneyEvent = inputType !== "texto" && inputType !== "botão" && inputType !== "manual";
  const branch = active.branches?.find((item) => (!isJourneyEvent && item.trigger === "qualquer resposta") || (item.trigger === inputType && (
    item.trigger === "texto"
      ? normalized.includes(item.response.trim().toLocaleLowerCase())
      : item.trigger === "botão" ? item.response.trim().toLocaleLowerCase() === normalized : true)
  ));
  const legacyMatch = isJourneyEvent || active.branches?.length ? undefined : active.nextNodeId;
  const destinationId = branch?.nextNodeId ?? legacyMatch;
  return nodes.find((node) => node.id === destinationId) ?? null;
}
