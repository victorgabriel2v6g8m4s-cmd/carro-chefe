import { useEffect, useRef, useState } from "react";
import { formatDate } from "@carro-chefe/ui";

export function AgentLiveConsole({ logs, live }: { logs: any[]; live: boolean }) {
  const [tab, setTab] = useState<"activity" | "terminal">("activity");
  const terminalRef = useRef<HTMLPreElement>(null);
  const activity = logs.filter((item) => item.channel !== "terminal");
  const terminal = logs.filter((item) => item.channel === "terminal" || item.eventType.startsWith("command."));
  useEffect(() => { if (tab === "terminal" && terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [tab, terminal.length]);
  return <section className="panel live-console"><div className="section-title"><div><span className="eyebrow">Observabilidade da execução</span><h3>Atividade e terminal em tempo real</h3></div><span className={`live-indicator ${live ? "is-live" : ""}`}><i />{live ? "Ao vivo" : "Encerrada"}</span></div><div className="console-tabs" role="tablist" aria-label="Visualização da execução"><button role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")}>Atividade <small>{activity.length}</small></button><button role="tab" aria-selected={tab === "terminal"} onClick={() => setTab("terminal")}>Terminal <small>{terminal.length}</small></button></div>{tab === "activity" ? <div className="activity-feed" role="log" aria-live="polite">{activity.length ? activity.map((item) => <article key={item.id} className={`activity-entry entry-${item.channel}`}><i /><div><div><strong>{item.title || item.eventType}</strong><time>{formatDate(item.createdAt)}</time></div>{item.content && <pre>{item.content}</pre>}</div></article>) : <p className="muted">A atividade aparecerá quando o runtime iniciar a execução.</p>}</div> : <pre className="terminal-view" ref={terminalRef} role="log" aria-live="polite" aria-label="Saída do terminal do agente">{terminal.length ? terminal.map((item) => item.content).join("") : "Aguardando comandos do agente…\n"}</pre>}<small className="console-note">O terminal mostra somente comandos e saídas reportados pelo runtime desta execução.</small></section>;
}
