import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { CommandComposer } from "../components/CommandComposer";
import { StatusBadge } from "../components/StatusBadge";

export function Commands() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api<any[]>("/api/v1/intents").then(setItems); }, []);
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Orquestração em linguagem natural</span><h2>Comandos</h2><p>Orientações, decisões informadas e verificações ficam ligadas aos agentes, tarefas e evidências que produziram o resultado.</p></section><CommandComposer /><section className="panel"><div className="section-title"><div><span className="eyebrow">Histórico</span><h3>Comandos encaminhados</h3></div></div>{items.length ? <div className="command-list">{items.map((item) => <Link key={item.id} to={`/gestao/comandos/${item.id}`}><div><StatusBadge status={item.status} /><small>{formatDate(item.createdAt)} · {item.runs.length} agente{item.runs.length === 1 ? "" : "s"}</small></div><strong>{item.summary}</strong><p>{item.prompt}</p></Link>)}</div> : <p className="muted">Nenhum comando enviado ainda.</p>}</section></div>;
}
