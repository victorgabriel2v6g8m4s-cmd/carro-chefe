import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { RichReferences } from "../components/RichReferences";

const labels: Record<string, string> = { task_added: "Tarefa adicionada", task_resolved: "Tarefa resolvida", task_cancelled: "Tarefa eliminada", task_status_changed: "Status da tarefa alterado", decision_added: "Decisão adicionada", decision_resolved: "Decisão resolvida", decision_cancelled: "Decisão eliminada", decision_context_added: "Informação adicionada", agent_run_created: "Execução criada" };

export function Registry() {
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { api<any[]>("/api/v1/audit?limit=500").then(setEvents); }, []);
  const q = (params.get("q") ?? "").toLocaleLowerCase("pt-BR");
  const filtered = events.filter((item) => !q || `${item.action} ${item.entityType} ${item.entityId} ${item.summary} ${item.actor}`.toLocaleLowerCase("pt-BR").includes(q));
  const updateSearch = (value: string) => { const next = new URLSearchParams(params); value ? next.set("q", value) : next.delete("q"); setParams(next, { replace: true }); };
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Auditoria append-only</span><h2>Registro de mudanças</h2><p>Tarefas e decisões adicionadas, resolvidas, canceladas ou enriquecidas permanecem consultáveis.</p></section>
    <section className="panel search-panel"><label><span>Buscar no registro</span><input type="search" value={params.get("q") ?? ""} onChange={(event) => updateSearch(event.target.value)} placeholder="Ação, tarefa, decisão, agente ou justificativa" /></label><small>{filtered.length} evento(s)</small></section>
    <section className="panel audit-register">{filtered.map((item) => <article key={item.id}><div><span className={`audit-kind audit-kind--${item.entityType}`}>{labels[item.action] || item.action}</span><time>{formatDate(item.createdAt)}</time></div><h3>{item.entityId}</h3><p><RichReferences text={item.summary} /></p><footer><span>{item.actor}</span>{item.taskId && <Link to={`/gestao/tarefas/${item.taskId}`}>Abrir tarefa →</Link>}{item.decisionId && <Link to={`/gestao/governanca#decision-${item.decisionId}`}>Abrir decisão →</Link>}</footer></article>)}</section>
  </div>;
}
