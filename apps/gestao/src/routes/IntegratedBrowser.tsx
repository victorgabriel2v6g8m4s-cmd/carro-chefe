import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { api } from "../api/client";

function routeForNavigation(item: any) {
  if (item.targetType === "upload") return `/gestao/visualizador?uploadId=${encodeURIComponent(item.target)}`;
  if (item.targetType === "file") return `/gestao/visualizador?path=${encodeURIComponent(item.target)}`;
  return item.target;
}

function safeBrowserTarget(target: string) {
  const cleanTarget = DOMPurify.sanitize(target, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  if (cleanTarget.startsWith("/gestao/visualizador?")) return cleanTarget;
  try {
    const parsed = new URL(cleanTarget);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "about:blank";
  } catch {
    return "about:blank";
  }
}

export function IntegratedBrowser() {
  const [params, setParams] = useSearchParams();
  const runId = params.get("runId") ?? "";
  const [address, setAddress] = useState(params.get("url") ?? "http://127.0.0.1:4173/welcome");
  const [current, setCurrent] = useState(params.get("url") ?? "http://127.0.0.1:4173/welcome");
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const load = () => api<any[]>(`/api/v1/browser-navigations${runId ? `?runId=${encodeURIComponent(runId)}` : ""}`).then((items) => {
    setNavigationHistory(items); const latest = items[0]; if (latest) { const target = routeForNavigation(latest); setAddress(target); setCurrent(target); }
  });
  useEffect(() => { void load(); }, [runId]);
  useEffect(() => {
    const events = new EventSource("/api/v1/events");
    const navigate = (event: MessageEvent) => { const item = JSON.parse(event.data).payload; if (runId && item.runId !== runId) return; const target = routeForNavigation(item); setAddress(target); setCurrent(target); setNotice(`${item.actor} abriu: ${item.title || item.target}`); void api(`/api/v1/browser-navigations/${item.id}/opened`, { method: "POST" }); void load(); };
    events.addEventListener("browser.navigation.requested", navigate as EventListener); return () => events.close();
  }, [runId]);
  const frameUrl = useMemo(() => safeBrowserTarget(current), [current]);
  function navigate(event: FormEvent) {
    event.preventDefault(); let target = address.trim(); if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) target = `https://${target}`;
    setCurrent(target); const next = new URLSearchParams(params); if (/^https?:\/\//i.test(target)) next.set("url", target); setParams(next, { replace: true });
  }
  return <div className="page-stack browser-page"><section className="intro"><span className="eyebrow">Navegação assistida</span><h2>Navegador integrado dos agentes</h2><p>O agente pode conduzir esta área até a página ou arquivo exato da execução. Ações em sessões pessoais continuam sob seu controle.</p></section>
    <section className="panel browser-toolbar"><form onSubmit={navigate}><button type="button" onClick={() => history.back()} aria-label="Voltar">←</button><input aria-label="Endereço" value={address} onChange={(event) => setAddress(event.target.value)} /><button className="button">Abrir</button></form>{notice && <p role="status">{notice}</p>}</section>
    <section className="browser-workspace"><div className="browser-frame panel"><div className="browser-chrome"><i /><i /><i /><span>{current}</span><a href={frameUrl} target="_blank" rel="noreferrer">Abrir fora ↗</a></div><iframe title="Navegador integrado" src={frameUrl} sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts" /></div>
      <aside className="panel browser-history"><span className="eyebrow">Fluxo da execução</span><h3>Navegações pedidas</h3>{navigationHistory.length ? navigationHistory.map((item) => <button key={item.id} onClick={() => { const target = routeForNavigation(item); setAddress(target); setCurrent(target); }}><strong>{item.title || item.target}</strong><small>{item.actor} · {item.status}</small>{item.reason && <span>{item.reason}</span>}</button>) : <p className="muted">Nenhuma navegação foi pedida pelo agente. Use a barra acima ou abra esta página a partir de uma execução.</p>}</aside>
    </section>
  </div>;
}
