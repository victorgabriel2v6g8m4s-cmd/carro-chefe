import { Link } from "react-router-dom";
import type { AgentQuestion } from "../types";

export function AnswerContext({ question }: { question: AgentQuestion }) {
  if (!question.answerReferences?.length && !question.uploads?.length) return null;
  return <div className="answer-context">
    {(question.answerReferences ?? []).length > 0 && <div><small>Referências citadas</small><span>{(question.answerReferences ?? []).map((reference) => reference.route ? <Link key={`${reference.type}-${reference.id}`} to={reference.route}>@{reference.id}</Link> : <b key={`${reference.type}-${reference.id}`}>@{reference.id}</b>)}</span></div>}
    {(question.uploads ?? []).length > 0 && <div><small>Anexos da resposta</small><span>{(question.uploads ?? []).map((upload) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}>{upload.originalName}</Link>)}</span></div>}
  </div>;
}
