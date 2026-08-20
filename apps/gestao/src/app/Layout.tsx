import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { api, json } from "../api/client";
import { useData } from "./data";
import { NotificationCenter } from "../components/NotificationCenter";
import { messages } from "../i18n";
import type { UiState } from "../types";

type NavigationItem = { path: string; label: string; number: string; notification?: "questions" };

const nav: NavigationItem[] = [
  { path: "/gestao/visao-geral", label: messages.navigation.items.overview, number: "01" },
  { path: "/gestao/comandos", label: messages.navigation.items.commands, number: "02" },
  { path: "/gestao/roteiro", label: messages.navigation.items.roadmap, number: "03" },
  { path: "/gestao/tarefas", label: messages.navigation.items.tasks, number: "04" },
  { path: "/gestao/agentes", label: messages.navigation.items.agents, number: "05" },
  { path: "/gestao/perguntas", label: messages.navigation.items.questions, number: "06", notification: "questions" },
  { path: "/gestao/governanca", label: messages.navigation.items.governance, number: "07" },
  { path: "/gestao/compras", label: messages.navigation.items.procurement, number: "08" },
  { path: "/gestao/registro", label: messages.navigation.items.registry, number: "09" },
  { path: "/gestao/conhecimento", label: messages.navigation.items.knowledge, number: "10" },
  { path: "/gestao/navegador", label: messages.navigation.items.browser, number: "11" },
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
    api<UiState>("/api/v1/me/ui-state/gestao").then((state) => {
      if (!state) return;
      setSidebarOpen(innerWidth <= 820 ? false : (state.sidebarOpen ?? true));
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
    <a className="skip-link" href="#main">{messages.navigation.skipToContent}</a>
    <button ref={trigger} className="menu-trigger" onClick={() => setSidebarOpen(true)} aria-label={messages.navigation.openMenu} aria-expanded={sidebarOpen} aria-controls="sidebar">☰ <span>{messages.navigation.menu}</span></button>
    {sidebarOpen && <button className="backdrop" aria-label={messages.navigation.closeMenu} onClick={closeMenu} />}
    <aside ref={sidebar} id="sidebar" className="sidebar" aria-label={messages.navigation.ariaLabel} aria-hidden={!sidebarOpen} inert={!sidebarOpen ? true : undefined}>
      <div className="brand"><img src="/assets/brand/logo-base.png" alt="Carro Chefe" /><div><strong>{messages.navigation.brandTitle}</strong><span>{messages.navigation.brandSubtitle}</span></div></div>
      <button ref={closeButton} className="close-menu" onClick={closeMenu} aria-label={messages.navigation.closeMenu}>×</button>
      <nav>{nav.map(({ path, label, number, notification }) => <NavLink key={path} to={path} onClick={() => { if (innerWidth <= 820) setSidebarOpen(false); }}><small>{number}</small><span>{label}</span>{notification === "questions" && !!data?.pendingQuestions && <b>{data.pendingQuestions}</b>}</NavLink>)}</nav>
      <div className="sidebar-note"><small>{messages.navigation.principle}</small><p>{messages.navigation.sidebarNote}</p></div>
    </aside>
    <main id="main" aria-hidden={mobile && sidebarOpen} inert={mobile && sidebarOpen ? true : undefined}>
      <header className="topbar"><div><small>Carro Chefe · {data?.project?.stage ?? messages.navigation.loadingStage}</small><h1>{nav.find(({ path }) => location.pathname.startsWith(path))?.label ?? messages.navigation.management}</h1></div><div className="topbar-actions"><div className="live"><i /> {messages.navigation.synchronized}</div><NotificationCenter /></div></header>
      <Outlet />
      <footer>{messages.navigation.operationalMemory}</footer>
    </main>
  </div>;
}
