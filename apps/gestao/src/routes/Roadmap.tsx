import { Link, useSearchParams } from "react-router-dom";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Roadmap() {
  const { data, loading } = useData();
  const [params, setParams] = useSearchParams();
  if (loading || !data) return <section className="panel loading">Carregando roteiro…</section>;
  const q = (params.get("q") ?? "").toLocaleLowerCase("pt-BR");
  const updateSearch = (value: string) => { const next = new URLSearchParams(params); value ? next.set("q", value) : next.delete("q"); setParams(next, { replace: true }); };
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Da fundação à escala</span><h2>Roteiro de implantação</h2><p>Cada fase tem objetivo e critério claro de saída. A busca permanece na URL para sobreviver ao recarregamento.</p></section>
    <section className="panel search-panel"><label><span>Buscar no roteiro</span><input type="search" value={params.get("q") ?? ""} onChange={(event) => updateSearch(event.target.value)} placeholder="Fase, objetivo, critério ou tarefa" /></label></section>
    <div className="roadmap">{data.project.milestones.map((milestone: any, index: number) => {
      const allTasks = data.tasks.filter((task) => task.milestoneId === milestone.id);
      const milestoneMatches = !q || `${milestone.name} ${milestone.objective} ${milestone.exitCriteria}`.toLocaleLowerCase("pt-BR").includes(q);
      const tasks = milestoneMatches ? allTasks : allTasks.filter((task) => `${task.id} ${task.title}`.toLocaleLowerCase("pt-BR").includes(q));
      if (q && !milestoneMatches && !tasks.length) return null;
      const completed = allTasks.filter((task) => task.status === "done").length;
      return <section className="milestone" key={milestone.id}><div className="milestone-marker">{String(index + 1).padStart(2, "0")}</div><div className="panel"><div className="section-title"><div><span className="eyebrow">{completed}/{allTasks.length} concluídas</span><h3>{milestone.name}</h3></div><StatusBadge status={milestone.status} /></div><p>{milestone.objective}</p><div className="exit-criteria"><small>Critério de saída</small>{milestone.exitCriteria}</div><div className="task-chips">{tasks.map((task) => <Link to={`/gestao/tarefas/${task.id}`} key={task.id}><StatusBadge status={task.status} /> {task.title}</Link>)}</div></div></section>;
    })}</div>
  </div>;
}
