import { useState, type FormEvent } from "react";
import { api, json } from "../api/client";
import { AttachmentPicker } from "./AttachmentPicker";
import { ReferenceComposer, type ScopedReference } from "./ReferenceComposer";
import type { Upload } from "../types";

export function QuestionResponseForm({ questionId, taskId, onAnswered, initialValue = "", suggestions = [] }:
  { questionId: string; taskId?: string; onAnswered: () => Promise<void> | void; initialValue?: string; suggestions?: string[] }) {
  const [answer, setAnswer] = useState(initialValue);
  const [files, setFiles] = useState<File[]>([]);
  const [references, setReferences] = useState<ScopedReference[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setFeedback("");
    try {
      const attachmentIds: string[] = [];
      for (const file of files) {
        setFeedback(`Enviando ${file.name}…`);
        const form = new FormData();
        form.append("purpose", "question-answer-draft"); form.append("actor", "proprietario"); form.append("file", file);
        attachmentIds.push((await api<Pick<Upload, "id">>("/api/v1/uploads", { method: "POST", body: form })).id);
      }
      await api(`/api/v1/agent-questions/${questionId}/answer`, json("POST", { answer, answeredBy: "proprietario", attachmentIds, references }));
      setAnswer(""); setFiles([]); setReferences([]); await onAnswered();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSending(false); }
  }

  return <form className="answer-form" onSubmit={submit}><label><span>Sua resposta</span><ReferenceComposer taskId={taskId} value={answer} onChange={setAnswer} references={references} onReferencesChange={setReferences} disabled={sending} placeholder="Responda com a decisão, condições e use @ para citar uma referência." /></label>{suggestions.length > 0 && <div className="option-list">{suggestions.map((option) => <button type="button" key={option} onClick={() => setAnswer(option)}>{option}</button>)}</div>}<AttachmentPicker files={files} onChange={setFiles} disabled={sending} /><div className="answer-actions"><small>{feedback || "Anexos e referências ficarão preservados nesta execução."}</small><button className="button button--gold" disabled={sending}>{sending ? "Enviando…" : "Responder e devolver à fila"}</button></div></form>;
}
