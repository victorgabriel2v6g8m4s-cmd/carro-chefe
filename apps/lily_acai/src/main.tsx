import { StrictMode, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getLilyAuthStatus, getLilyConfig, getLilySession, loginLily, logoutLily, registerLily, submitCookLilyLead, type AuthPayload, type LilyPublicConfig } from "./api";
import { CatalogPage, FeaturedCarousel } from "./catalog";
import { AdminCatalog, AdminHome, AdminMedia } from "./admin";
import { CartProvider, useCart } from "./features/cart/CartContext";
import { CartPage } from "./features/cart/CartPage";
import { CheckoutPage } from "./features/checkout/CheckoutPage";
import { AddressesPage, OrderDetailPage, OrdersPage } from "./features/account/AccountPages";
import { ProfilePage, RankingPage } from "./features/account/ProfilePage";
import { AdminFulfillmentPage } from "./features/admin/AdminFulfillmentPage";
import { attributionForApi, hasCookLilyAttribution, readCookLilyAttribution, readStoredCookLilyAttribution, storeCookLilyAttribution } from "./tracking";
import "./styles.css";

const brandLogo = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;

function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L20 8H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>;
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 19c.8-4 3-6 6.5-6s5.7 2 6.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function ProfileBubble({ user }: { user: AuthPayload["user"] | null }) {
  const initial = user?.displayName?.trim()[0]?.toUpperCase();
  return <span className="header-profile-bubble">
    {user?.avatarUrl
      ? <img src={user.avatarUrl} alt="" />
      : initial
        ? <span aria-hidden="true">{initial}</span>
        : <PersonIcon />}
  </span>;
}

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/cardapio";
  const withoutBase = raw.replace(/^\/lilyacai(?=\/|$)/, "") || "/cardapio";
  return withoutBase.startsWith("/") && !withoutBase.startsWith("//") ? withoutBase : "/cardapio";
}

function AttributionCapture() {
  useEffect(() => {
    const attribution = readCookLilyAttribution(window.location.search);
    if (hasCookLilyAttribution(attribution)) {
      storeCookLilyAttribution(attribution);
    }
  }, []);
  return null;
}

function Shell({ children }: { children: ReactNode }) {
  const cart = useCart();
  const navigate = useNavigate();
  const [config, setConfig] = useState<LilyPublicConfig | null>(null);
  const [user, setUser] = useState<AuthPayload["user"] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    getLilyConfig().then(setConfig).catch(() => setConfig(null));
    getLilyAuthStatus().then((value) => setUser(value.user)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const firstFocusable = menuRef.current?.querySelector<HTMLElement>("a,button");
    window.setTimeout(() => firstFocusable?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.setTimeout(() => menuButtonRef.current?.focus(), 0);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const instagramUrl = config?.social.instagramUrl ?? null;
  const whatsappUrl = config?.social.whatsappUrl ?? null;
  const isStaff = user ? ["staff", "admin"].includes(user.role) : false;
  const closeMenu = () => setMenuOpen(false);

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      const session = await getLilySession();
      await logoutLily(session.csrfToken);
    } catch {
      // Se a sessão já expirou, o resultado esperado na interface também é sair.
    } finally {
      setUser(null);
      setMenuOpen(false);
      setLogoutBusy(false);
      navigate("/cardapio", { replace: true });
    }
  }

  return <div className="lily-shell">
    <header className="topbar">
      <Link className="brand" to="/cardapio" aria-label="CookLily — cardápio" onClick={closeMenu}>
        <img className="brand-logo" src={brandLogo} alt="" width="48" height="48" />
        <span className="brand-copy"><strong><span className="brand-cook">cook</span><span className="brand-lily">Lily</span></strong><small>açaí · LilyShakes</small></span>
      </Link>

      <nav className="desktop-nav" aria-label="Navegação principal">
        <Link to="/cardapio">Cardápio</Link>
        <Link to="/ranking">Ranking</Link>
        {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
        {isStaff && <Link to="/painel">Painel</Link>}
        {user
          ? <>
              <Link className="account-link" to="/perfil"><ProfileBubble user={user} /><span>Minha conta</span></Link>
              <button className="nav-button" type="button" onClick={handleLogout} disabled={logoutBusy}>{logoutBusy ? "Saindo..." : "Sair"}</button>
            </>
          : <>
              <Link to="/entrar">Entrar</Link>
              <Link className="button primary header-signup" to="/cadastro">Criar conta</Link>
            </>}
      </nav>

      <div className="header-actions">
        <Link className="header-icon cart-icon" to="/carrinho" aria-label={`Carrinho com ${cart.itemCount} item(ns)`}>
          <CartIcon />
          {cart.itemCount > 0 && <span className="cart-badge">{cart.itemCount}</span>}
        </Link>
        <Link className="header-icon mobile-only" to={user ? "/perfil" : "/entrar"} aria-label={user ? "Abrir perfil" : "Entrar ou criar conta"}>
          <ProfileBubble user={user} />
        </Link>
        <button ref={menuButtonRef} className="header-icon mobile-only" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="lily-mobile-menu" onClick={() => setMenuOpen((value) => !value)}>
          <MenuIcon />
        </button>
      </div>

      {menuOpen && <>
        <button className="mobile-menu-backdrop" type="button" aria-label="Fechar menu" tabIndex={-1} onClick={closeMenu} />
        <nav ref={menuRef} id="lily-mobile-menu" className="mobile-menu" aria-label="Menu mobile" tabIndex={-1}>
          <div className="mobile-menu-heading">
            <strong>Menu</strong>
            {user && <small>{user.displayName || user.phone}</small>}
          </div>
          <Link to="/cardapio" onClick={closeMenu}>Cardápio</Link>
          <Link to="/ranking" onClick={closeMenu}>Ranking</Link>
          {isStaff && <Link className="staff-menu-link" to="/painel" onClick={closeMenu}>Painel administrativo</Link>}
          {user ? <>
            <Link to="/perfil" onClick={closeMenu}>Meu perfil</Link>
            <Link to="/pedidos" onClick={closeMenu}>Meus pedidos</Link>
            <Link to="/enderecos" onClick={closeMenu}>Endereços</Link>
            <button className="mobile-menu-action" type="button" onClick={handleLogout} disabled={logoutBusy}>{logoutBusy ? "Saindo..." : "Sair da conta"}</button>
          </> : <>
            <Link to="/entrar" onClick={closeMenu}>Entrar</Link>
            <Link className="mobile-menu-primary" to="/cadastro" onClick={closeMenu}>Criar conta</Link>
          </>}
          <div className="mobile-menu-secondary">
            {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>Instagram @{config?.social.instagramHandle}</a>}
            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>WhatsApp</a>}
          </div>
        </nav>
      </>}
    </header>

    <main>{children}</main>

    <footer>
      <div>
        <strong>CookLily</strong>
        <p>Cremosidade, sabor e qualidade em cada garrafa.</p>
        {config?.store.address && <small>{config.store.address}</small>}
      </div>
      <div className="footer-links">
        {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer">@{config?.social.instagramHandle}</a>}
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}
        <Link to="/ranking">Ranking</Link>
        <Link to="/privacidade">Privacidade</Link>
      </div>
      <small>CookLily × Carro Chefe — parceria temporária.</small>
    </footer>
  </div>;
}

function Landing() {
  const [config, setConfig] = useState<LilyPublicConfig | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getLilyConfig()
      .then((value) => setConfig(value))
      .catch(() => {
        setState("error");
        setMessage("Não foi possível carregar o cadastro agora. Você ainda pode falar com a CookLily pelo WhatsApp.");
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const accepted = data.get("marketingConsent") === "on";
    if (!accepted) {
      setState("error");
      setMessage("Marque a autorização para receber cupons e promoções antes de entrar na lista.");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      const current = readCookLilyAttribution(window.location.search);
      const stored = readStoredCookLilyAttribution();
      const attribution = hasCookLilyAttribution(current) ? current : stored;
      await submitCookLilyLead({
        phone: String(data.get("phone") ?? ""),
        marketingConsent: true,
        consentVersion: config.consentVersions.lilyMarketing,
        privacyPolicyVersion: config.privacyPolicyVersion,
        attribution: attributionForApi(attribution),
        website: String(data.get("website") ?? "")
      });
      form.reset();
      setState("success");
      setMessage("Cadastro recebido. Quando houver cupons e promoções CookLily, este WhatsApp poderá receber as novidades.");
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : "Não foi possível cadastrar agora.");
    }
  }

  const trackingText = encodeURIComponent("Olá! Vim pelo site da CookLily e gostaria de acompanhar meu pedido.");
  const trackingWhatsapp = config?.social.whatsappUrl ?? null;
  return <Shell>
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="eyebrow">CookLily · novidades no seu WhatsApp</span>
        <h1>Entre na lista da CookLily.</h1>
        <p>Cadastre seu número para receber cupons, promoções e novidades quando estiverem disponíveis. Sem precisar criar senha.</p>
        <div className="landing-points" aria-label="Benefícios da lista">
          <span>Cupons quando houver campanha</span>
          <span>Promoções CookLily</span>
          <span>Contato direto pelo WhatsApp</span>
        </div>
      </div>
      <form className="lead-card" onSubmit={submit}>
        <span className="eyebrow">Quero receber novidades</span>
        <h2>Seu WhatsApp é suficiente.</h2>
        <label>WhatsApp
          <input name="phone" inputMode="tel" autoComplete="tel" placeholder="(67) 99999-9999" required />
        </label>
        <label className="check lead-consent">
          <input name="marketingConsent" type="checkbox" />
          <span>Quero receber cupons, promoções e novidades da CookLily neste número. Posso pedir para sair da lista depois.</span>
        </label>
        <label className="trap-field" aria-hidden="true">Site
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <p className="privacy-note">Ao enviar, você concorda com o uso do telefone para esta finalidade. <Link to="/privacidade">Veja como tratamos os dados.</Link></p>
        {message && <p className={state === "success" ? "success" : "error"} role="status">{message}</p>}
        <button className="button primary" disabled={state === "submitting" || !config}>
          {state === "submitting" ? "Cadastrando..." : "Entrar na lista"}
        </button>
      </form>
    </section>
    <FeaturedCarousel />
    <section className="whatsapp-card">
      <div><span className="eyebrow">Acompanhamento P0</span><h2>Já fez um pedido?</h2><p>O acompanhamento inicial é humano pelo WhatsApp oficial da CookLily. Não colocamos nome, endereço ou telefone na URL.</p></div>
      {trackingWhatsapp
        ? <a className="button primary" href={`${trackingWhatsapp}?text=${trackingText}`} target="_blank" rel="noreferrer">Acompanhar pelo WhatsApp</a>
        : <Link className="button primary" to="/cardapio">Ver cardápio</Link>}
    </section>
  </Shell>;
}

function Cardapio() {
  return <Shell><CatalogPage /></Shell>;
}

function Cadastro() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<{ termsVersion: string; privacyPolicyVersion: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { getLilyConfig().then(setConfig).catch(() => setError("Não foi possível carregar os termos atuais.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      setBusy(false);
      return;
    }
    try {
      await registerLily({
        phone: String(form.get("phone") ?? ""),
        password,
        displayName: String(form.get("displayName") ?? "") || undefined,
        termsAccepted: true,
        termsVersion: config.termsVersion,
        privacyPolicyVersion: config.privacyPolicyVersion,
        consents: {
          lilyMarketing: form.get("lilyMarketing") === "on",
          shareWithCarroChefe: form.get("shareWithCarroChefe") === "on",
          analyticsOptional: form.get("analyticsOptional") === "on"
        }
      });
      navigate("/cardapio");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar conta.");
    } finally {
      setBusy(false);
    }
  }

  return <Shell><section className="form-page">
    <div className="form-copy"><span className="eyebrow">Conta CookLily</span><h1>Crie sua conta.</h1><p>Crie sua conta para ter uma experiência mais rápida. Preferências opcionais não impedem o uso da loja.</p></div>
    <form className="auth-card" onSubmit={submit}>
      <label>Nome <span>opcional</span><input name="displayName" autoComplete="name" maxLength={80} /></label>
      <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label>Senha <span>mínimo 12 caracteres</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label>Confirmar senha<input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label className="check"><input type="checkbox" required /> <span>Li e aceito os <Link to="/privacidade">termos operacionais e o aviso de privacidade</Link>.</span></label>
      <div className="optional-box"><strong>Preferências opcionais</strong>
        <label className="check"><input name="lilyMarketing" type="checkbox" /> <span>Quero receber novidades e ofertas da CookLily.</span></label>
        <label className="check"><input name="shareWithCarroChefe" type="checkbox" /> <span>Autorizo compartilhar dados selecionados com o Carro Chefe para ofertas futuras. Posso recusar e continuar usando a CookLily.</span></label>
        <label className="check"><input name="analyticsOptional" type="checkbox" /> <span>Permito analytics não essencial para melhorar a experiência.</span></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || !config}>{busy ? "Criando..." : "Criar conta"}</button>
      <p className="form-switch">Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </form>
  </section></Shell>;
}

function Entrar() {
  const navigate = useNavigate();
  const nextPath = safeNextPath(new URLSearchParams(window.location.search).get("next"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await loginLily({ phone: String(form.get("phone") ?? ""), password: String(form.get("password") ?? "") });
      navigate(nextPath, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao entrar.");
    } finally {
      setBusy(false);
    }
  }
  return <Shell><section className="form-page">
    <div className="form-copy"><span className="eyebrow">Bem-vindo de volta</span><h1>Entrar na CookLily.</h1><p>Esta sessão vale somente para a operação CookLily.</p></div>
    <form className="auth-card" onSubmit={submit}>
      <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
      <p className="form-switch">Primeira vez? <Link to="/cadastro">Criar conta</Link></p>
    </form>
  </section></Shell>;
}

function Privacidade() {
  return <Shell><article className="legal-page">
    <span className="eyebrow">Versão operacional</span><h1>Privacidade e consentimentos</h1>
    <p>Esta é a versão operacional usada durante a construção da CookLily e deverá ser substituída pela versão jurídica definitiva antes da venda pública, quando os dados do controlador e os prazos de retenção estiverem aprovados.</p>
    <h2>Lista de novidades</h2><p>Para entrar na lista de cupons e promoções, a CookLily registra o WhatsApp informado, a versão do consentimento e, quando existir, a atribuição de campanha/QR. Esse cadastro não exige conta nem senha e não é compartilhado automaticamente com o Carro Chefe.</p>
    <h2>Conta separada</h2><p>Quando uma conta CookLily for utilizada, sessão, endereço, pedido e pagamento permanecem em domínio de dados próprio e não autenticam o usuário no Carro Chefe.</p>
    <h2>O que é necessário</h2><p>Para manter uma conta, usamos o telefone informado, hash da senha, registros técnicos de sessão e o aceite dos termos aplicáveis. Senhas e tokens de sessão não são armazenados em texto puro.</p>
    <h2>Escolhas opcionais</h2><p>Marketing CookLily, analytics não essencial e compartilhamento com o Carro Chefe são escolhas independentes. Recusar qualquer uma delas não impede cadastro nem compra.</p>
    <h2>Compartilhamento</h2><p>Consentir com compartilhamento não mistura automaticamente as bases. Qualquer transferência futura deverá selecionar somente dados permitidos por finalidade e consentimento vigente.</p>
    <h2>Pagamentos</h2><p>A aplicação não foi projetada para armazenar número de cartão ou CVV. A integração de pagamento será feita em entrega posterior com provedor aprovado.</p>
  </article></Shell>;
}

function App() {
  return <><AttributionCapture /><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/cardapio" element={<Cardapio />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route path="/entrar" element={<Entrar />} />
    <Route path="/privacidade" element={<Privacidade />} />
    <Route path="/carrinho" element={<Shell><CartPage /></Shell>} />
    <Route path="/checkout" element={<Shell><CheckoutPage /></Shell>} />
    <Route path="/enderecos" element={<Shell><AddressesPage /></Shell>} />
    <Route path="/pedidos" element={<Shell><OrdersPage /></Shell>} />
    <Route path="/pedidos/:id" element={<Shell><OrderDetailPage /></Shell>} />
    <Route path="/perfil" element={<Shell><ProfilePage /></Shell>} />
    <Route path="/ranking" element={<Shell><RankingPage /></Shell>} />
    <Route path="/painel" element={<Shell><AdminHome /></Shell>} />
    <Route path="/painel/cardapio" element={<Shell><AdminCatalog /></Shell>} />
    <Route path="/painel/midias" element={<Shell><AdminMedia /></Shell>} />
    <Route path="/painel/entrega" element={<Shell><AdminFulfillmentPage /></Shell>} />
    <Route path="*" element={<Navigate to="/cardapio" replace />} />
  </Routes></>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter basename="/lilyacai"><CartProvider><App /></CartProvider></BrowserRouter></StrictMode>
);
