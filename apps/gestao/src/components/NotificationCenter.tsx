import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { messages } from "../i18n";
import type { NotificationItem } from "../types";

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const load = async (showNewest = false) => {
    const next = await api<NotificationItem[]>("/api/v1/notifications?unread=true");
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
    events.addEventListener("agent.run.completed", completed);
    events.addEventListener("agent.run.attention", completed);
    events.addEventListener("roadmap.next-step.suggested", completed);
    const polling = setInterval(() => void load(), 15_000);
    return () => { events.close(); clearInterval(polling); };
  }, []);
  async function read(item: NotificationItem) { await api(`/api/v1/notifications/${item.id}/read`, { method: "POST" }); setItems((current) => current.filter((entry) => entry.id !== item.id)); if (toast?.id === item.id) setToast(null); }
  const toastType = toast?.type ?? "completed";
  const toastLabel = toastType === "next_step" ? messages.notifications.nextStep : toastType === "question" ? messages.notifications.question : ["failed", "error"].includes(toastType) ? messages.notifications.attention : messages.notifications.completed;
  return <div className="notification-center"><button className="notification-trigger" aria-label={`${items.length} ${messages.notifications.unread}`} onClick={() => setOpen((value) => !value)}>♢{items.length > 0 && <b>{items.length}</b>}</button>{open && <div className="notification-popover"><div><strong>{messages.notifications.title}</strong><button aria-label={messages.notifications.close} onClick={() => setOpen(false)}>×</button></div>{items.length ? items.map((item) => <Link to={item.route || "/gestao/comandos"} key={item.id} onClick={() => void read(item)}><small>{item.title}</small><span>{item.message}</span></Link>) : <p>{messages.notifications.empty}</p>}</div>}{toast && <aside className={`toast toast-${toastType}`} role="status"><button aria-label={messages.notifications.closeOne} onClick={() => void read(toast)}>×</button><span>{toastLabel}</span><strong>{toast.title}</strong><p>{toast.message}</p><Link to={toast.route || "/gestao/comandos"} onClick={() => void read(toast)}>{messages.notifications.viewDetails}</Link></aside>}</div>;
}
