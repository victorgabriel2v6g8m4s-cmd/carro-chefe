import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { CommandComposer } from "../components/CommandComposer";
import { ManagementChat } from "../components/ManagementChat";
import { StatusBadge } from "../components/StatusBadge";

export function Commands() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const mode = params.get("mode") === "chat" ? "chat" : "dispatch";
  useEffect(() => { api<any[]>("/api/v1/intents").then(setItems); }, []);
  function selectMode(nextMode: "dispatch" | "chat") { setParams((current) => { const next = new URLSearchParams(current); next.set("mode", nextMode); return next; }); }
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Orquestração em linguagem natural</span><h2>Comandos</h2><p>Despache trabalho rastreável ou converse diretamente com a Gestão sem criar uma tarefa.</p></section>
    <div className="command-mode-tabs" role="tablist"><button role="tab" aria-selected={mode === "dispatch"} className={mode === "dispatch" ? "active" : ""} onClick={() => selectMode("dispatch")}>Despachar comando</button><button role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "active" : ""} onClick={() => selectMode("chat")}>Conversar com Gestão</button></div>
    {mode === "dispatch" ? <CommandComposer /> : <ManagementChat />}
    <section className="panel"><div className="section-title"><div><span className="eyebrow">Histórico</span><h3>Comandos encaminhados</h3></div></div>{items.length ? <div className="command-list">{items.map((item) => <Link key={item.id} to={`/gestao/comandos/${item.id}`}><div><StatusBadge status={item.status} /><small>{formatDate(item.createdAt)} · {item.runs.length} agente{item.runs.length === 1 ? "" : "s"}</small></div><strong>{item.summary}</strong><p>{item.prompt}</p></Link>)}</div> : <p className="muted">Nenhum comando enviado ainda.</p>}</section>
  </div>;
}
