import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, json } from "../api/client";

function targetFor(item: any) {
  if (item.targetType === "upload") return `/gestao/visualizador?uploadId=${encodeURIComponent(item.target)}`;
  if (item.targetType === "file") return `/gestao/visualizador?path=${encodeURIComponent(item.target)}`;
  return item.target;
}

export function IntegratedBrowser() {
  const [params, setParams] = useSearchParams();
  const runId = params.get("runId") ?? "owner";
  const sessionId = `co-${runId}`;
  const initialAddress = useRef(params.get("url") ?? "http://127.0.0.1:4173/welcome").current;
  const [address, setAddress] = useState(initialAddress);
  const [current, setCurrent] = useState(address);
  const [image, setImage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

  const applyFrame = useCallback(async (response: Response) => {
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Não foi possível capturar a página.");
    const url = decodeURIComponent(response.headers.get("X-Browser-Url") || "");
    const blob = await response.blob();
    setImage((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
    if (url) { setCurrent(url); setAddress(url); }
    return url;
  }, []);

  const refreshFrame = useCallback(async () => {
    const response = await fetch(`/api/v1/browser/session/${encodeURIComponent(sessionId)}/snapshot?at=${Date.now()}`);
    await applyFrame(response);
  }, [applyFrame, sessionId]);

  const navigate = useCallback(async (target: string) => {
    if (target.startsWith("/gestao/visualizador")) { location.assign(target); return; }
    setBusy(true); setNotice("Abrindo em uma sessão isolada…");
    try {
      const response = await fetch(`/api/v1/browser/session/${encodeURIComponent(sessionId)}/navigate`, { ...json("POST", { url: target }), headers: { "Content-Type": "application/json" } });
      const url = await applyFrame(response);
      setNotice("Página pronta para visualização e interação.");
      if (url) setParams((previous) => { const next = new URLSearchParams(previous); next.set("url", url); return next; }, { replace: true });
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }, [applyFrame, sessionId, setParams]);

  const loadHistory = useCallback(() => api<any[]>(`/api/v1/browser-navigations${runId !== "owner" ? `?runId=${encodeURIComponent(runId)}` : ""}`).then(setHistory), [runId]);
  useEffect(() => { void loadHistory(); void navigate(initialAddress); }, [loadHistory, navigate, initialAddress]);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);
  useEffect(() => {
    const events = new EventSource("/api/v1/events");
    const requested = (event: MessageEvent) => { const item = JSON.parse(event.data).payload; if (runId !== "owner" && item.runId !== runId) return; const target = targetFor(item); setNotice(`${item.actor} solicitou: ${item.title || item.target}`); void navigate(target); void api(`/api/v1/browser-navigations/${item.id}/opened`, { method: "POST" }); void loadHistory(); };
    events.addEventListener("browser.navigation.requested", requested as EventListener); return () => events.close();
  }, [loadHistory, navigate, runId]);

  async function submit(event: FormEvent) { event.preventDefault(); let target = address.trim(); if (!/^https?:\/\//i.test(target)) target = `https://${target}`; await navigate(target); }
  async function interact(action: "click" | "back" | "reload" | "scroll", extra: Record<string, number> = {}) {
    setBusy(true); try { const result = await api<any>(`/api/v1/browser/session/${encodeURIComponent(sessionId)}/interact`, json("POST", { action, ...extra })); setCurrent(result.url); await refreshFrame(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); }
  }
  function clickFrame(event: MouseEvent<HTMLImageElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    void interact("click", { x: Math.round((event.clientX - box.left) * 1440 / box.width), y: Math.round((event.clientY - box.top) * 900 / box.height) });
  }

  return <div className="page-stack browser-page"><section className="intro"><span className="eyebrow">Sessão isolada e controlável</span><h2>Navegador integrado dos agentes</h2><p>A página é aberta pelo navegador do Supervisor e transmitida para a Central. Assim, sites HTTPS funcionam mesmo quando proíbem incorporação por iframe.</p></section>
    <section className="panel browser-toolbar"><form onSubmit={submit}><button type="button" onClick={() => void interact("back")} aria-label="Voltar">←</button><button type="button" onClick={() => void interact("reload")} aria-label="Recarregar">↻</button><input aria-label="Endereço" value={address} onChange={(event) => setAddress(event.target.value)} /><button className="button" disabled={busy}>Abrir</button></form>{notice && <p role="status">{notice}</p>}</section>
    <section className="browser-workspace"><div className="browser-frame panel"><div className="browser-chrome"><i /><i /><i /><span>{current}</span></div><div className={`browser-stream ${busy ? "browser-stream--busy" : ""}`}>{image ? <img ref={imageRef} src={image} alt={`Captura interativa de ${current}`} onClick={clickFrame} /> : <p>Inicializando navegador…</p>}<div className="browser-scroll-controls"><button onClick={() => void interact("scroll", { deltaY: -650 })}>Subir</button><button onClick={() => void interact("scroll", { deltaY: 650 })}>Descer</button></div></div></div>
      <aside className="panel browser-history"><span className="eyebrow">Fluxo da execução</span><h3>Navegações pedidas</h3>{history.length ? history.map((item) => <button key={item.id} onClick={() => void navigate(targetFor(item))}><strong>{item.title || item.target}</strong><small>{item.actor} · {item.status}</small>{item.reason && <span>{item.reason}</span>}</button>) : <p className="muted">Nenhuma navegação foi pedida pelo agente.</p>}</aside>
    </section></div>;
}
