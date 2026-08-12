import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { api, json } from "../api/client";
import { useData } from "./data";
import { NotificationCenter } from "../components/NotificationCenter";

const nav = [
  ["/gestao/visao-geral", "Visão geral", "01"], ["/gestao/comandos", "Comandos", "02"],
  ["/gestao/roteiro", "Roteiro", "03"], ["/gestao/tarefas", "Tarefas", "04"],
  ["/gestao/agentes", "Agentes", "05"], ["/gestao/perguntas", "Perguntas", "06"],
  ["/gestao/governanca", "Governança", "07"], ["/gestao/compras", "Compras", "08"]
];

export function Layout() {
  const { data } = useData();
  const location = useLocation();
  const [mobile, setMobile] = useState(() => innerWidth <= 820);
  const [sidebarOpen, setSidebarOpen] = useState(() => innerWidth > 820);
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setMobile(innerWidth <= 820);
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    api<any>("/api/v1/me/ui-state/gestao").then((state) => {
      if (!state) return;
      setSidebarOpen(innerWidth <= 820 ? false : state.sidebarOpen);
      if (state.route === location.pathname && state.search === location.search && state.hash === location.hash) setTimeout(() => window.scrollTo(0, state.scrollY ?? 0), 50);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void api("/api/v1/me/ui-state/gestao", json("PUT", { route: location.pathname, search: location.search,
        hash: location.hash, scrollY: window.scrollY, sidebarOpen, selectedTaskId: location.pathname.match(/tarefas\/([^/]+)/)?.[1] ?? null, filters: {} }));
    }, 350);
    return () => clearTimeout(timer);
  }, [location, sidebarOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const saveScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void api("/api/v1/me/ui-state/gestao", json("PUT", { route: location.pathname,
        search: location.search, hash: location.hash, scrollY: window.scrollY, sidebarOpen,
        selectedTaskId: location.pathname.match(/tarefas\/([^/]+)/)?.[1] ?? null, filters: {} })), 450);
    };
    addEventListener("scroll", saveScroll, { passive: true });
    return () => { clearTimeout(timer); removeEventListener("scroll", saveScroll); };
  }, [location, sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    if (mobile) { document.body.style.overflow = "hidden"; setTimeout(() => closeButton.current?.focus(), 0); }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSidebarOpen(false); trigger.current?.focus(); return; }
      if (event.key !== "Tab" || !mobile || !sidebar.current) return;
      const focusable = [...sidebar.current.querySelectorAll<HTMLElement>('a,button,[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); };
  }, [mobile, sidebarOpen]);

  const closeMenu = () => { setSidebarOpen(false); trigger.current?.focus(); };
  return <div className={`shell ${sidebarOpen ? "shell--open" : "shell--closed"}`}>
    <a className="skip-link" href="#main">Pular para o conteúdo</a>
    <button ref={trigger} className="menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" aria-expanded={sidebarOpen} aria-controls="sidebar">☰ <span>Menu</span></button>
    {sidebarOpen && <button className="backdrop" aria-label="Fechar menu" onClick={closeMenu} />}
    <aside ref={sidebar} id="sidebar" className="sidebar" aria-label="Navegação principal" aria-hidden={!sidebarOpen} inert={!sidebarOpen ? true : undefined}>
      <div className="brand"><img src="/assets/brand/logo-base.png" alt="Carro Chefe" /><div><strong>Central</strong><span>Operacional</span></div></div>
      <button ref={closeButton} className="close-menu" onClick={closeMenu} aria-label="Fechar menu lateral">×</button>
      <nav>{nav.map(([to, label, number]) => <NavLink key={to} to={to} onClick={() => { if (innerWidth <= 820) setSidebarOpen(false); }}><small>{number}</small><span>{label}</span>{label === "Perguntas" && !!data?.pendingQuestions && <b>{data.pendingQuestions}</b>}</NavLink>)}</nav>
      <div className="sidebar-note"><small>Princípio</small><p>O ERP registra vendas. Esta central registra como o negócio evolui.</p></div>
    </aside>
    <main id="main" aria-hidden={mobile && sidebarOpen} inert={mobile && sidebarOpen ? true : undefined}>
      <header className="topbar"><div><small>Carro Chefe · {data?.project?.stage ?? "Carregando"}</small><h1>{nav.find(([to]) => location.pathname.startsWith(to))?.[1] ?? "Gestão"}</h1></div><div className="topbar-actions"><div className="live"><i /> Sincronizado</div><NotificationCenter /></div></header>
      <Outlet />
      <footer>Carro Chefe · Central Operacional · SQLite sincronizado</footer>
    </main>
  </div>;
}
