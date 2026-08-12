import { Link } from "react-router-dom";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Roadmap() {
  const { data, loading } = useData();
  if (loading || !data) return <section className="panel loading">Carregando roteiro…</section>;
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Da fundação à escala</span><h2>Roteiro de implantação</h2><p>Cada fase tem um objetivo e um critério claro de saída. As tarefas abaixo permanecem ligadas ao histórico e às evidências.</p></section>
    <div className="roadmap">{data.project.milestones.map((milestone: any, index: number) => {
      const tasks = data.tasks.filter((task) => task.milestoneId === milestone.id);
      const completed = tasks.filter((task) => task.status === "done").length;
      return <section className="milestone" key={milestone.id}><div className="milestone-marker">{String(index + 1).padStart(2, "0")}</div><div className="panel"><div className="section-title"><div><span className="eyebrow">{completed}/{tasks.length} concluídas</span><h3>{milestone.name}</h3></div><StatusBadge status={milestone.status} /></div><p>{milestone.objective}</p><div className="exit-criteria"><small>Critério de saída</small>{milestone.exitCriteria}</div><div className="task-chips">{tasks.map((task) => <Link to={`/gestao/tarefas/${task.id}`} key={task.id}><StatusBadge status={task.status} /> {task.title}</Link>)}</div></div></section>;
    })}</div>
  </div>;
}
