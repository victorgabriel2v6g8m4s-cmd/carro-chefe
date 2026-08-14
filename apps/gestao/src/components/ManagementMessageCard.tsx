import { Link } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { ExecutionShortcuts } from "./ExecutionShortcuts";
import { RichReferences } from "./RichReferences";
import { StatusBadge } from "./StatusBadge";

export function ManagementMessageCard({ message }: { message: any }) {
  const owner = ["PROPRIETARIO", "owner", "proprietario"].includes(message.sender);
  return <article className={`management-message management-message--${owner ? "owner" : "agent"}`}>
    <header><strong>{message.sender === "AG-GESTAO" ? "Gestão" : "Você"}</strong><time>{formatDate(message.createdAt)}</time>{message.run && <StatusBadge status={message.run.status} />}</header>
    <p><RichReferences text={message.content} /></p>
    {message.references?.length > 0 && <div className="message-references">{message.references.map((reference: any) => reference.route ? <Link key={`${reference.type}-${reference.id}`} to={reference.route}>@{reference.id}</Link> : <b key={`${reference.type}-${reference.id}`}>@{reference.id}</b>)}</div>}
    {message.uploads?.length > 0 && <div className="message-attachments">{message.uploads.map((upload: any) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}>{upload.originalName}</Link>)}</div>}
    {!owner && message.run?.shortcuts?.length > 0 && <ExecutionShortcuts shortcuts={message.run.shortcuts} />}
    {message.runId && <Link className="message-run-link" to={`/gestao/agentes/execucoes/${message.runId}`}>Abrir execução e logs</Link>}
  </article>;
}
