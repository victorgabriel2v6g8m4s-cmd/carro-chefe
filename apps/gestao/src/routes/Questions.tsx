import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Questions() {
  const { refresh } = useData();
  const [params, setParams] = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const status = params.get("status") ?? "pending";
  const load = () => api<any[]>(`/api/v1/agent-questions${status !== "all" ? `?status=${status}` : ""}`).then(setQuestions);
  useEffect(() => { void load(); }, [status]);
  async function answer(event: FormEvent, questionId: string) {
    event.preventDefault();
    await api(`/api/v1/agent-questions/${questionId}/answer`, json("POST", { answer: answers[questionId], answeredBy: "proprietario" }));
    setAnswers((current) => ({ ...current, [questionId]: "" })); await Promise.all([load(), refresh()]);
  }
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Canal de decisão</span><h2>Perguntas dos agentes</h2><p>Cada pergunta permanece ligada à tarefa e à execução que a originou. Sua resposta volta para a fila do agente e entra na linha do tempo.</p></section>
    <div className="tabs" role="tablist"><button className={status === "pending" ? "active" : ""} onClick={() => setParams({ status: "pending" })}>Pendentes</button><button className={status === "answered" ? "active" : ""} onClick={() => setParams({ status: "answered" })}>Respondidas</button><button className={status === "all" ? "active" : ""} onClick={() => setParams({ status: "all" })}>Todas</button></div>
    {questions.length ? <div className="question-list">{questions.map((question) => <article className={`panel question-card ${question.status === "pending" ? "question-card--pending" : ""}`} key={question.id}><div className="question-top"><div><StatusBadge status={question.status} /><span>{question.run?.agent?.name} · {formatDate(question.createdAt)}</span></div><Link to={`/gestao/tarefas/${question.task?.id}`}>{question.task?.id}</Link></div><h3>{question.question}</h3><p>{question.context}</p>{question.recommendation && <div className="recommendation"><small>Recomendação do agente</small><strong>{question.recommendation}</strong></div>}{question.options?.length > 0 && <div className="option-list">{question.options.map((option: string) => <button key={option} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}>{option}</button>)}</div>}{question.status === "pending" ? <form className="answer-form" onSubmit={(event) => answer(event, question.id)}><label><span>Sua resposta</span><textarea required minLength={2} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Responda com a decisão e qualquer condição importante." /></label><button className="button button--gold">Enviar ao agente</button></form> : <div className="answer-box"><small>Resposta de {question.answeredBy} · {formatDate(question.answeredAt)}</small><strong>{question.answer}</strong></div>}<Link className="run-link" to={`/gestao/agentes/execucoes/${question.runId}`}>Ver execução e passo a passo →</Link></article>)}</div> : <section className="panel empty"><h3>Nenhuma pergunta nesta caixa.</h3><p>Quando um agente precisar de uma decisão, o contexto aparecerá aqui.</p></section>}
  </div>;
}
