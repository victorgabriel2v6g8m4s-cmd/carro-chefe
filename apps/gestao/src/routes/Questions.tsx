import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";
import { QuestionResponseForm } from "../components/QuestionResponseForm";
import { AnswerContext } from "../components/AnswerContext";
import { RichReferences } from "../components/RichReferences";

export function Questions() {
  const { refresh } = useData();
  const [params, setParams] = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const status = params.get("status") ?? "pending";
  const load = () => api<any[]>(`/api/v1/agent-questions${status !== "all" ? `?status=${status}` : ""}`).then(setQuestions);
  useEffect(() => { void load(); }, [status]);

  return <div className="page-stack"><section className="intro"><span className="eyebrow">Canal de decisão</span><h2>Perguntas dos agentes</h2><p>Cada pergunta permanece ligada à tarefa e à execução que a originou. A resposta pode incluir mídias, documentos e referências selecionadas com @.</p></section>
    <div className="tabs" role="tablist"><button className={status === "pending" ? "active" : ""} onClick={() => setParams({ status: "pending" })}>Pendentes</button><button className={status === "answered" ? "active" : ""} onClick={() => setParams({ status: "answered" })}>Respondidas</button><button className={status === "all" ? "active" : ""} onClick={() => setParams({ status: "all" })}>Todas</button></div>
    {questions.length ? <div className="question-list">{questions.map((question) => <article className={`panel question-card ${question.status === "pending" ? "question-card--pending" : ""}`} key={question.id}><div className="question-top"><div><StatusBadge status={question.status} /><span>{question.run?.agent?.name} · {formatDate(question.createdAt)}</span></div><Link to={`/gestao/tarefas/${question.task?.id}`}>{question.task?.id}</Link></div><h3>{question.question}</h3><p>{question.context}</p>{question.recommendation && <div className="recommendation"><small>Recomendação do agente</small><strong>{question.recommendation}</strong></div>}{question.status === "pending" ? <QuestionResponseForm questionId={question.id} taskId={question.taskId} suggestions={question.options ?? []} onAnswered={async () => { await Promise.all([load(), refresh()]); }} /> : <div className="answer-box"><small>Resposta de {question.answeredBy} · {formatDate(question.answeredAt)}</small><strong><RichReferences text={question.answer} /></strong><AnswerContext question={question} /></div>}<Link className="run-link" to={`/gestao/agentes/execucoes/${question.runId}`}>Ver execução e passo a passo →</Link></article>)}</div> : <section className="panel empty"><h3>Nenhuma pergunta nesta caixa.</h3><p>Quando um agente precisar de uma decisão, o contexto aparecerá aqui.</p></section>}
  </div>;
}
