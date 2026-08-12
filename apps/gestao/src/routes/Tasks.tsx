import { Link, useSearchParams } from "react-router-dom";
import { priority } from "@carro-chefe/ui";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Tasks() {
  const { data, loading } = useData();
  const [params, setParams] = useSearchParams();
  if (loading || !data) return <section className="panel loading">Carregando tarefas…</section>;
  const q = params.get("q")?.toLocaleLowerCase("pt-BR") ?? "";
  const status = params.get("status") ?? "";
  const owner = params.get("responsavel") ?? "";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next, { replace: true }); };
  const tasks = data.tasks.filter((task) => (!q || `${task.id} ${task.title}`.toLocaleLowerCase("pt-BR").includes(q)) && (!status || task.status === status) && (!owner || task.ownerAgentId === owner)).sort((a, b) => priority(b) - priority(a));
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Plano vivo</span><h2>Tarefas e responsabilidades</h2><p>Os filtros fazem parte do endereço da página: você pode recarregar ou compartilhar sem perder o contexto.</p></section>
    <section className="panel filters"><label><span>Buscar</span><input value={params.get("q") ?? ""} onChange={(event) => update("q", event.target.value)} placeholder="Título ou código" /></label><label><span>Status</span><select value={status} onChange={(event) => update("status", event.target.value)}><option value="">Todos</option><option value="ready">Prontas</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueadas</option><option value="review">Em revisão</option><option value="done">Concluídas</option></select></label><label><span>Responsável</span><select value={owner} onChange={(event) => update("responsavel", event.target.value)}><option value="">Todos</option>{data.project.agents.map((agent: any) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></section>
    <section className="panel table-panel"><div className="section-title"><div><span className="eyebrow">{tasks.length} resultados</span><h3>Fila priorizada</h3></div></div><div className="task-table" role="table"><div className="task-table-head" role="row"><span>Prioridade</span><span>Tarefa</span><span>Responsável</span><span>Status</span></div>{tasks.map((task) => <Link role="row" className="task-table-row" key={task.id} to={`/gestao/tarefas/${task.id}${location.search}`}><span data-label="Prioridade"><b className="score">{priority(task)}</b><small>{task.impact} × {task.urgency}</small></span><span data-label="Tarefa"><strong>{task.title}</strong><small>{task.id} · {task.pillar?.name}</small></span><span data-label="Responsável">{task.owner?.name}</span><span data-label="Status"><StatusBadge status={task.status} /></span></Link>)}</div></section>
  </div>;
}
