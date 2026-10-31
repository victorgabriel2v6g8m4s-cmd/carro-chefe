import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "../../router";
import { Activity, BarChart3, ChefHat, ClipboardList, Coins, CreditCard, Gift, LayoutDashboard, Menu, MessageCircle, Package, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, Percent, Settings, Shield, Store, Truck, Users, Video, type LucideIcon } from "lucide-react";
import { getLilySession, type AuthPayload } from "../../api";

type AdminLink = { label: string; to: string; icon: LucideIcon; adminOnly?: boolean };

const adminLinks: AdminLink[] = [
  { label: "Visão geral", to: "/painel", icon: LayoutDashboard },
  { label: "Cardápio", to: "/painel/cardapio", icon: Store },
  { label: "Landing Page", to: "/painel/landing", icon: PanelsTopLeft },
  { label: "Pesquisas", to: "/painel/pesquisas", icon: ClipboardList },
  { label: "Cupons e ofertas", to: "/painel/cupons", icon: Percent },
  { label: "Programa VIP", to: "/painel/vip", icon: Gift },
  { label: "Níveis e LilyCoins", to: "/painel/fidelidade", icon: Coins },
  { label: "Mídias", to: "/painel/midias", icon: Video },
  { label: "Entrega e retirada", to: "/painel/entrega", icon: Truck },
  { label: "Configurações da loja", to: "/painel/configuracoes", icon: Settings },
  { label: "Métodos e descontos", to: "/painel/pagamentos/metodos", icon: CreditCard },
  { label: "Pagamentos e reconciliação", to: "/painel/pagamentos", icon: CreditCard },
  { label: "Pedidos", to: "/painel/pedidos", icon: Package },
  { label: "Analytics", to: "/painel/analytics", icon: BarChart3 },
  { label: "Saúde", to: "/painel/saude", icon: Activity },
  { label: "WhatsApp", to: "/painel/whatsapp", icon: MessageCircle },
  { label: "Cozinha", to: "/painel/cozinha", icon: ChefHat },
  { label: "Gestão de entregas", to: "/painel/entregas", icon: Truck, adminOnly: true },
  { label: "Visão do entregador", to: "/entregas", icon: Truck, adminOnly: true },
  { label: "Equipe", to: "/painel/equipe", icon: Users, adminOnly: true }
];

const STORAGE_KEY = "cooklily.admin-navigation.collapsed";

export function AdminNavigationLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [role, setRole] = useState<AuthPayload["user"]["role"] | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getLilySession().then((session) => { if (active) setRole(session.user.role); }).catch(() => { if (active) setRole(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* storage may be disabled */ }
      return next;
    });
  }

  return <div className={`admin-workspace${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
    <button className="admin-sidebar-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="cooklily-admin-navigation" onClick={() => setMobileOpen((value) => !value)}>
      <Menu size={18} aria-hidden="true" />{mobileOpen ? "Fechar navegação" : "Navegação do painel"}
    </button>
    <aside className="admin-sidebar" id="cooklily-admin-navigation" aria-label="Navegação administrativa">
      <div className="admin-sidebar-heading"><span className="admin-sidebar-title">Módulos</span><button className="admin-sidebar-collapse" type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
      <nav className="admin-sidebar-links">{adminLinks.filter((item) => !item.adminOnly || role === "admin").map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/painel"} className="admin-sidebar-link" title={collapsed ? label : undefined} aria-label={label}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
      {role === "admin" && <span className="admin-sidebar-role"><Shield size={15} aria-hidden="true" />Admin</span>}
    </aside>
    <div className="admin-workspace-content">{children}</div>
  </div>;
}
