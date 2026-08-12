import { Link } from "react-router-dom";
import { priority } from "@carro-chefe/ui";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";
import { CommandComposer } from "../components/CommandComposer";

export function Overview() {
  const { data, loading, error } = useData();
  if (loading) return <section className="panel loading">Sincronizando a operação…</section>;
  if (error || !data) return <section className="panel error">{error ?? "Não foi possível carregar o plano."}</section>;
  const done = data.tasks.filter((task) => task.status === "done").length;
  const blocked = data.tasks.filter((task) => task.status === "blocked");
  const urgent = [...data.tasks].filter((task) => task.status !== "done").sort((a, b) => priority(b) - priority(a)).slice(0, 5);
  const activeRuns = data.runs.filter((run) => ["queued", "running", "waiting_input"].includes(run.status));
  return <div className="page-stack">
    <section className="hero-panel">
      <div><span className="eyebrow">Fundação do negócio</span><h2>{data.project?.northStar}</h2><p>Um único lugar para entender o que precisa acontecer, quem está cuidando e por quê cada decisão foi tomada.</p></div>
      <Link className="button button--gold" to="/gestao/tarefas">Abrir plano de execução</Link>
    </section>
    <CommandComposer />
    <section className="metric-grid" aria-label="Indicadores do plano">
      <article><small>Conclusão</small><strong>{done}/{data.tasks.length}</strong><span>tarefas concluídas</span></article>
      <article><small>Bloqueios</small><strong>{blocked.length}</strong><span>pedem ação</span></article>
      <article><small>Agentes ativos</small><strong>{activeRuns.length}</strong><span>execuções abertas</span></article>
      <article className={data.pendingQuestions ? "metric-alert" : ""}><small>Perguntas</small><strong>{data.pendingQuestions}</strong><span>aguardando você</span></article>
    </section>
    <div className="content-grid">
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Prioridade combinada</span><h3>Próximas ações</h3></div><Link to="/gestao/tarefas">Ver todas</Link></div>
        <div className="item-list">{urgent.map((task) => <Link className="item-row" key={task.id} to={`/gestao/tarefas/${task.id}`}><span className="score">{priority(task)}</span><span><strong>{task.title}</strong><small>{task.owner?.name} · impacto {task.impact} × urgência {task.urgency}</small></span><StatusBadge status={task.status} /></Link>)}</div>
      </section>
      <aside className="panel"><div className="section-title"><div><span className="eyebrow">Agora</span><h3>Central dos agentes</h3></div></div>
        {data.pendingQuestions > 0 ? <Link className="attention-card" to="/gestao/perguntas"><strong>{data.pendingQuestions} resposta{data.pendingQuestions > 1 ? "s" : ""} necessária{data.pendingQuestions > 1 ? "s" : ""}</strong><span>Abra o contexto, veja a recomendação do agente e responda sem sair da tarefa.</span></Link> : <p className="muted">Nenhum agente está aguardando sua resposta.</p>}
        <div className="mini-list">{activeRuns.slice(0, 4).map((run) => <Link key={run.id} to={`/gestao/agentes/execucoes/${run.id}`}><StatusBadge status={run.status} /><span><strong>{run.title}</strong><small>{run.currentStep || "Aguardando início"}</small></span></Link>)}</div>
      </aside>
    </div>
  </div>;
}
