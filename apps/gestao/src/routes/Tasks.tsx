import { Link, useSearchParams } from "react-router-dom";
import { priority } from "@carro-chefe/ui";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";
import { TaskCreatePanel } from "../components/TaskCreatePanel";
import { messages } from "../i18n";

export function Tasks() {
  const { data, loading } = useData();
  const [params, setParams] = useSearchParams();
  if (loading || !data) return <section className="panel loading">{messages.common.states.loadingData}</section>;

  const q = params.get("q")?.toLocaleLowerCase("pt-BR") ?? "";
  const status = params.get("status") ?? "";
  const owner = params.get("responsavel") ?? "";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };
  const tasks = data.tasks.filter((task) => (!q || `${task.id} ${task.title}`.toLocaleLowerCase("pt-BR").includes(q))
    && (!status || task.status === status) && (!owner || task.ownerAgentId === owner)).sort((a, b) => priority(b) - priority(a));

  return <div className="page-stack">
    <TaskCreatePanel />
    <section className="intro"><span className="eyebrow">{messages.tasks.eyebrow}</span><h2>{messages.tasks.title}</h2><p>{messages.tasks.intro}</p></section>
    <section className="panel filters">
      <label><span>{messages.tasks.search}</span><input value={params.get("q") ?? ""} onChange={(event) => update("q", event.target.value)} placeholder={messages.tasks.searchPlaceholder} /></label>
      <label><span>{messages.tasks.status}</span><select value={status} onChange={(event) => update("status", event.target.value)}><option value="">{messages.tasks.all}</option><option value="ready">Prontas</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueadas</option><option value="review">Em revisão</option><option value="done">Concluídas</option></select></label>
      <label><span>{messages.tasks.owner}</span><select value={owner} onChange={(event) => update("responsavel", event.target.value)}><option value="">{messages.tasks.all}</option>{data.project.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
    </section>
    <section className="panel table-panel"><div className="section-title"><div><span className="eyebrow">{tasks.length} {messages.tasks.results}</span><h3>{messages.tasks.queue}</h3></div></div><div className="task-table" role="table"><div className="task-table-head" role="row"><span>{messages.tasks.priority}</span><span>{messages.tasks.task}</span><span>{messages.tasks.owner}</span><span>{messages.tasks.status}</span></div>{tasks.map((task) => <Link role="row" className="task-table-row" key={task.id} to={`/gestao/tarefas/${task.id}${location.search}`}><span data-label={messages.tasks.priority}><b className="score">{priority(task)}</b><small>{task.impact} × {task.urgency}</small></span><span data-label={messages.tasks.task}><strong>{task.title}</strong><small>{task.id} · {task.pillar?.name}</small></span><span data-label={messages.tasks.owner}>{task.owner?.name}</span><span data-label={messages.tasks.status}><StatusBadge status={task.status} /></span></Link>)}</div></section>
  </div>;
}
