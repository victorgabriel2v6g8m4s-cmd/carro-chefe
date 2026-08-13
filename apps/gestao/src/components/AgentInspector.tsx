import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "./StatusBadge";

export function AgentInspector({ agentId, onClose }: { agentId: string | null; onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!agentId) return;
    setStats(null); setError("");
    api<any>(`/api/v1/agents/${agentId}/stats`).then(setStats).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [agentId]);
  if (!agentId) return null;
  return <div className="inspector-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside className="agent-inspector" role="dialog" aria-modal="true" aria-labelledby="agent-inspector-title">
      <button className="inspector-close" onClick={onClose} aria-label="Fechar detalhes do agente">×</button>
      {!stats ? <p className="loading">{error || "Calculando desempenho…"}</p> : <>
        <span className="eyebrow">{stats.agent.id}</span><h2 id="agent-inspector-title">{stats.agent.name}</h2><p>{stats.agent.mission}</p>
        <div className="agent-settings"><div><small>Modelo</small><strong>{stats.agent.model || "Padrão do Codex"}</strong></div><div><small>Raciocínio</small><strong>{stats.agent.reasoningEffort}</strong></div><div><small>Navegador</small><strong>{stats.agent.browserEnabled ? "Habilitado" : "Desabilitado"}</strong></div></div>
        <div className="agent-stats"><div><strong>{stats.interactions}</strong><small>interações</small></div><div><strong>{stats.succeeded}</strong><small>sucessos</small></div><div><strong>{stats.failed}</strong><small>falhas</small></div><div><strong>{stats.successRate === null ? "—" : `${stats.successRate}%`}</strong><small>desempenho estimado</small></div></div>
        <div className="performance-line"><span>Classificação</span><strong>{stats.performance}</strong><small>Base: {stats.terminalRuns} execução(ões) terminal(is); parciais contam na amostra.</small></div>
        <h3>Execuções recentes</h3><div className="mini-run-list">{stats.recentRuns.length ? stats.recentRuns.map((run: any) => <Link key={run.id} to={`/gestao/agentes/execucoes/${run.id}`} onClick={onClose}><span>{run.title}</span><StatusBadge status={run.outcome || run.status} /></Link>) : <p>Nenhuma execução registrada.</p>}</div>
      </>}
    </aside>
  </div>;
}
