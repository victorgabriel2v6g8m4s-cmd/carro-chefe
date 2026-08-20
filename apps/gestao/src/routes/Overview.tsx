import { Link } from "react-router-dom";
import { priority } from "@carro-chefe/ui";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";
import { CommandComposer } from "../components/CommandComposer";
import { messages } from "../i18n";

export function Overview() {
  const { data, loading, error } = useData();
  if (loading) return <section className="panel loading">{messages.common.states.loadingData}</section>;
  if (error || !data) return <section className="panel error">{error ?? "Não foi possível carregar o plano."}</section>;
  const done = data.tasks.filter((task) => task.status === "done").length;
  const blocked = data.tasks.filter((task) => task.status === "blocked");
  const urgent = [...data.tasks].filter((task) => task.status !== "done").sort((a, b) => priority(b) - priority(a)).slice(0, 5);
  const activeRuns = data.runs.filter((run) => ["queued", "running", "waiting_input"].includes(run.status));
  return <div className="page-stack">
    <section className="hero-panel">
      <div><span className="eyebrow">{messages.overview.foundation}</span><h2>{data.project?.northStar}</h2><p>{messages.overview.intro}</p></div>
      <Link className="button button--gold" to="/gestao/tarefas">{messages.overview.openPlan}</Link>
    </section>
    <CommandComposer />
    <section className="metric-grid" aria-label="Indicadores do plano">
      <article><small>{messages.overview.conclusion}</small><strong>{done}/{data.tasks.length}</strong><span>{messages.overview.completedTasks}</span></article>
      <article><small>{messages.overview.blocked}</small><strong>{blocked.length}</strong><span>{messages.overview.needAction}</span></article>
      <article><small>{messages.overview.activeAgents}</small><strong>{activeRuns.length}</strong><span>{messages.overview.openExecutions}</span></article>
      <article className={data.pendingQuestions ? "metric-alert" : ""}><small>{messages.overview.questions}</small><strong>{data.pendingQuestions}</strong><span>{messages.overview.awaitingOwner}</span></article>
    </section>
    <div className="content-grid">
      <section className="panel"><div className="section-title"><div><span className="eyebrow">{messages.overview.combinedPriority}</span><h3>{messages.overview.nextActions}</h3></div><Link to="/gestao/tarefas">{messages.overview.viewAll}</Link></div>
        <div className="item-list">{urgent.map((task) => <Link className="item-row" key={task.id} to={`/gestao/tarefas/${task.id}`}><span className="score">{priority(task)}</span><span><strong>{task.title}</strong><small>{task.owner?.name} · {messages.overview.impact} {task.impact} × {messages.overview.urgency} {task.urgency}</small></span><StatusBadge status={task.status} /></Link>)}</div>
      </section>
      <aside className="panel"><div className="section-title"><div><span className="eyebrow">{messages.overview.now}</span><h3>{messages.overview.agentCenter}</h3></div></div>
        {data.pendingQuestions > 0 ? <Link className="attention-card" to="/gestao/perguntas"><strong>{data.pendingQuestions} resposta{data.pendingQuestions > 1 ? "s" : ""} necessária{data.pendingQuestions > 1 ? "s" : ""}</strong><span>{messages.overview.answerContext}</span></Link> : <p className="muted">{messages.overview.awaitingAnswer}</p>}
        <div className="mini-list">{activeRuns.slice(0, 4).map((run) => <Link key={run.id} to={`/gestao/agentes/execucoes/${run.id}`}><StatusBadge status={run.status} /><span><strong>{run.title}</strong><small>{run.currentStep || messages.overview.waitingStart}</small></span></Link>)}</div>
      </aside>
    </div>
  </div>;
}
