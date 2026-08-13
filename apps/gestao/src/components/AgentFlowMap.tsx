import { formatDate } from "@carro-chefe/ui";

const ownerIds = new Set(["PROPRIETARIO", "proprietario", "owner"]);
const kindLabels: Record<string, string> = { delegation: "delegou", coordination: "coordena", handoff: "entregou contexto", question: "perguntou", answer: "respondeu", result: "reportou resultado", decision: "decidiu", update: "atualizou" };

function displayName(id: string, agents: any[]) {
  if (ownerIds.has(id)) return "Proprietário";
  return agents.find((agent) => agent.id === id)?.name ?? id;
}

export function AgentFlowMap({ agents, communications, compact = false, onAgentClick }: { agents: any[]; communications: any[]; compact?: boolean; onAgentClick?: (agentId: string) => void }) {
  const normalizeId = (id: string) => ownerIds.has(id) ? "PROPRIETARIO" : id;
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const participantIds = new Set<string>(["PROPRIETARIO"]);
  communications.forEach((item) => { participantIds.add(normalizeId(item.sourceId)); participantIds.add(normalizeId(item.targetId)); });
  const orderedIds = ["PROPRIETARIO", ...agents.map((agent) => agent.id).filter((id, index, items) => participantIds.has(id) && items.indexOf(id) === index),
    ...[...participantIds].filter((id) => id !== "PROPRIETARIO" && !agentById.has(id)).sort()];
  const nodes = orderedIds.map((id) => ({ id, name: id === "PROPRIETARIO" ? "Proprietário" : agentById.get(id)?.name ?? id, role: id === "PROPRIETARIO" ? "decisão" : agentById.get(id)?.role }));
  const positions = nodes.map((node, index) => {
    if (index === 0) return { ...node, x: 50, y: 50 };
    const angle = (Math.PI * 2 * (index - 1)) / Math.max(1, nodes.length - 1) - Math.PI / 2;
    return { ...node, x: 50 + Math.cos(angle) * 36, y: 50 + Math.sin(angle) * 36 };
  });
  const position = new Map(positions.map((item) => [item.id, item]));
  const edges = communications.filter((item) => position.has(normalizeId(item.sourceId)) && position.has(normalizeId(item.targetId)));
  const counts = new Map<string, number>();
  communications.forEach((item) => { const source = normalizeId(item.sourceId), target = normalizeId(item.targetId); counts.set(source, (counts.get(source) ?? 0) + 1); counts.set(target, (counts.get(target) ?? 0) + 1); });
  if (!communications.length) return <section className="panel agent-flow-empty"><span className="eyebrow">Fluxo de comunicação</span><h3>Mapa dos agentes</h3><p className="muted">As linhas aparecerão quando uma tarefa for delegada, houver perguntas, respostas, repasses ou resultados.</p></section>;
  return <section className={`panel agent-flow ${compact ? "agent-flow--compact" : ""}`}>
    <div className="section-title"><div><span className="eyebrow">Comunicação simplificada</span><h3>Mapa de fluxo entre agentes</h3></div><span className="count-chip">{communications.length}</span></div>
    <div className="flow-layout"><div className="flow-canvas" role="img" aria-label="Mapa direcional de comunicação entre proprietário e agentes">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker></defs>{edges.map((edge) => { const source = position.get(normalizeId(edge.sourceId))!; const target = position.get(normalizeId(edge.targetId))!; return <path key={edge.id} className={`flow-edge flow-edge--${edge.status}`} d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`} markerEnd="url(#flow-arrow)" />; })}</svg>
      {positions.map((node) => <button type="button" key={node.id} className={`flow-node ${node.id === "PROPRIETARIO" ? "flow-node--owner" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} disabled={node.id === "PROPRIETARIO" || !onAgentClick} onClick={() => onAgentClick?.(node.id)} aria-label={`${node.name}: ${counts.get(node.id) ?? 0} interações`}><b className="interaction-badge">{counts.get(node.id) ?? 0}</b><strong>{node.name}</strong><small>{node.id}</small></button>)}
    </div><div className="flow-feed" aria-label="Comunicações registradas">{communications.slice().reverse().slice(0, compact ? 5 : 10).map((item) => <article key={item.id}><div><strong>{displayName(item.sourceId, agents)}</strong><span aria-hidden="true">→</span><strong>{displayName(item.targetId, agents)}</strong></div><small>{kindLabels[item.kind] ?? item.kind} · {formatDate(item.createdAt)}</small><p>{item.summary}</p></article>)}</div></div>
    <div className="flow-legend"><span><i className="is-delivered" />entregue</span><span><i className="is-planned" />planejado</span><span>A seta indica a direção da informação.</span></div>
  </section>;
}
