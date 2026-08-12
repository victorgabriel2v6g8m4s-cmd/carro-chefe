import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { AttachmentPicker } from "./AttachmentPicker";

export function CommandComposer() {
  const navigate = useNavigate();
  const { refresh } = useData();
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setFeedback("");
    try {
      const attachmentIds: string[] = [];
      for (const file of files) {
        setFeedback(`Enviando ${file.name}…`);
        const form = new FormData();
        form.append("purpose", "intent-draft"); form.append("actor", "proprietario"); form.append("file", file);
        const upload = await api<any>("/api/v1/uploads", { method: "POST", body: form });
        attachmentIds.push(upload.id);
      }
      setFeedback("Classificando e encaminhando aos agentes…");
      const intent = await api<any>("/api/v1/intents", json("POST", { prompt, submittedBy: "proprietario", attachmentIds }));
      setFiles([]);
      await refresh();
      navigate(`/gestao/comandos/${intent.id}`);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSending(false); }
  }
  return <section className="command-box"><div><span className="eyebrow">Comando rápido</span><h3>Diga o que mudou ou o que precisa ser verificado.</h3><p>A Central identifica os responsáveis, registra o contexto e acompanha até a conclusão.</p></div><form onSubmit={submit}><label><span>Sua orientação</span><textarea required minLength={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder='Ex.: “O ERP vai ser o Bling, mas verifique se ele atende aos requisitos.”' /></label><AttachmentPicker files={files} onChange={setFiles} disabled={sending} /><div><small>{feedback || "Você poderá acompanhar agentes, passos, anexos e perguntas em tempo real."}</small><button className="button button--gold" disabled={sending}>{sending ? "Encaminhando…" : "Encaminhar aos agentes"}</button></div></form></section>;
}
