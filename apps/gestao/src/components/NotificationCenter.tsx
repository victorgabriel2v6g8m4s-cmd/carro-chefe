import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function NotificationCenter() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const load = async (showNewest = false) => {
    const next = await api<any[]>("/api/v1/notifications?unread=true");
    setItems(next);
    if (showNewest && next[0]) setToast(next[0]);
  };
  useEffect(() => {
    void load();
    const events = new EventSource("/api/v1/events");
    const completed = () => void load(true);
    events.addEventListener("intent.completed", completed);
    events.addEventListener("intent.failed", completed);
    events.addEventListener("agent.question.asked", completed);
    const polling = setInterval(() => void load(), 15_000);
    return () => { events.close(); clearInterval(polling); };
  }, []);
  async function read(item: any) { await api(`/api/v1/notifications/${item.id}/read`, { method: "POST" }); setItems((current) => current.filter((entry) => entry.id !== item.id)); if (toast?.id === item.id) setToast(null); }
  const toastLabel = toast?.type === "question" ? "Resposta necessária" : toast?.type === "failed" ? "Atenção" : "Concluído";
  return <div className="notification-center"><button className="notification-trigger" aria-label={`${items.length} notificações não lidas`} onClick={() => setOpen((value) => !value)}>♢{items.length > 0 && <b>{items.length}</b>}</button>{open && <div className="notification-popover"><div><strong>Notificações</strong><button aria-label="Fechar notificações" onClick={() => setOpen(false)}>×</button></div>{items.length ? items.map((item) => <Link to={item.route || "/gestao/comandos"} key={item.id} onClick={() => void read(item)}><small>{item.title}</small><span>{item.message}</span></Link>) : <p>Nenhuma novidade.</p>}</div>}{toast && <aside className={`toast toast-${toast.type}`} role="status"><button aria-label="Fechar notificação" onClick={() => void read(toast)}>×</button><span>{toastLabel}</span><strong>{toast.title}</strong><p>{toast.message}</p><Link to={toast.route || "/gestao/comandos"} onClick={() => void read(toast)}>Ver contexto →</Link></aside>}</div>;
}
