import { StrictMode, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getLilyConfig, loginLily, registerLily, submitCookLilyLead } from "./api";
import { attributionForApi, hasCookLilyAttribution, readCookLilyAttribution, readStoredCookLilyAttribution, storeCookLilyAttribution } from "./tracking";
import "./styles.css";

const instagram = "https://instagram.com/acai._lily";
const whatsapp = "https://wa.me/5567999289187";
const brandLogo = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;

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
  return <div className="lily-shell">
    <header className="topbar">
      <Link className="brand" to="/cardapio" aria-label="CookLily — início">
        <img className="brand-logo" src={brandLogo} alt="" width="48" height="48" />
        <span className="brand-copy"><strong><span className="brand-cook">cook</span><span className="brand-lily">Lily</span></strong><small>batidas de açaí</small></span>
      </Link>
      <nav aria-label="Navegação principal">
        <Link to="/">Início</Link>
        <Link to="/cardapio">Cardápio</Link>
        <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
      </nav>
    </header>
    <main>{children}</main>
    <footer>
      <div><strong>CookLily</strong><p>Cremosidade, sabor e qualidade em cada garrafa.</p></div>
      <div className="footer-links">
        <a href={instagram} target="_blank" rel="noreferrer">@acai._lily</a>
        <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
        <Link to="/privacidade">Privacidade</Link>
      </div>
      <small>CookLily × Carro Chefe — parceria temporária. Esta experiência usa a infraestrutura digital do Carro Chefe, mas possui cadastro e operação próprios.</small>
    </footer>
  </div>;
}

function Landing() {
  const [config, setConfig] = useState<{ privacyPolicyVersion: string; consentVersions: Record<string, string> } | null>(null);
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
  return <Shell>
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="eyebrow">CookLily · novidades no seu WhatsApp</span>
        <h1>Entre na lista da CookLily.</h1>
        <p>Cadastre seu número para receber cupons e promoções quando estiverem disponíveis. Sem criar senha e sem compartilhar seu cadastro automaticamente com o Carro Chefe.</p>
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
        <p className="privacy-note">Ao enviar, seu telefone fica na base própria da CookLily. <Link to="/privacidade">Veja como tratamos os dados.</Link></p>
        {message && <p className={state === "success" ? "success" : "error"} role="status">{message}</p>}
        <button className="button primary" disabled={state === "submitting" || !config}>
          {state === "submitting" ? "Cadastrando..." : "Entrar na lista"}
        </button>
      </form>
    </section>
    <section className="whatsapp-card">
      <div><span className="eyebrow">Acompanhamento P0</span><h2>Já fez um pedido?</h2><p>O acompanhamento inicial é humano pelo WhatsApp oficial da CookLily. Não colocamos nome, endereço ou telefone na URL.</p></div>
      <a className="button primary" href={`${whatsapp}?text=${trackingText}`} target="_blank" rel="noreferrer">Acompanhar pelo WhatsApp</a>
    </section>
  </Shell>;
}

function Cardapio() {
  return <Shell>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">CookLily · batidas de açaí</span>
        <h1>Cremosidade, sabor e qualidade em cada garrafa.</h1>
        <p>O cardápio online está sendo preparado. Os primeiros sabores confirmados são morango e maracujá; preços e disponibilidade só aparecem quando forem publicados pela operação.</p>
        <div className="hero-actions">
          <Link className="button primary" to="/cadastro">Criar minha conta</Link>
          <a className="button ghost" href={whatsapp} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
        </div>
      </div>
      <div className="brand-showcase" aria-label="Identidade visual CookLily">
        <div className="brand-orbit"><span className="brand-wordmark"><span>cook</span><em>Lily</em></span></div>
        <div className="flavour-tags" aria-label="Primeiros sabores confirmados">
          <span>Morango</span><span>Maracujá</span>
        </div>
      </div>
    </section>
    <section className="status-card" aria-labelledby="catalogo-status">
      <span className="eyebrow">Cardápio digital</span>
      <h2 id="catalogo-status">Catálogo em configuração</h2>
      <p>As fotos reais de morango e maracujá já fazem parte do acervo CookLily. Preços, disponibilidade e adicionais continuarão ocultos até serem cadastrados e publicados pela operação.</p>
    </section>
  </Shell>;
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
    try {
      await registerLily({
        phone: String(form.get("phone") ?? ""),
        password: String(form.get("password") ?? ""),
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
    <div className="form-copy"><span className="eyebrow">Conta CookLily</span><h1>Crie sua conta.</h1><p>Seu cadastro CookLily é separado do cadastro do Carro Chefe. Preferências opcionais não impedem o uso da loja.</p></div>
    <form className="auth-card" onSubmit={submit}>
      <label>Nome <span>opcional</span><input name="displayName" autoComplete="name" maxLength={80} /></label>
      <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label>Senha <span>mínimo 10 caracteres</span><input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await loginLily({ phone: String(form.get("phone") ?? ""), password: String(form.get("password") ?? "") });
      navigate("/cardapio");
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
    <h2>Conta separada</h2><p>Conta, sessão, endereço, pedido e pagamento CookLily são mantidos em domínio de dados próprio e não autenticam o usuário no Carro Chefe.</p>
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
    <Route path="*" element={<Navigate to="/cardapio" replace />} />
  </Routes></>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter basename="/lilyacai"><App /></BrowserRouter></StrictMode>
);
