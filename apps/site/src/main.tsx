import { StrictMode, useEffect, useMemo, useState } from "react";
import { SignupForm } from "./SignupForm";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./styles.css";
import { getAttribution, isBannerVipCampaign } from "./campaign";
import { campaignContent } from "./campaign-content";
import { getAnalyticsConsent, track, trackOnce, loadAnalyticsVendors, grantAnalytics, denyAnalytics } from "./analytics";
import type { AnalyticsConsent } from "./analytics";

const whatsapp = "https://wa.me/5567992046721";
const instagram = "https://instagram.com/carrochefe_cg";
function AnalyticsChoice({ onChange }: { onChange: (value: AnalyticsConsent) => void }) {
  const [consent, setConsent] = useState<AnalyticsConsent>(() => getAnalyticsConsent());

  const choose = (value: "granted" | "denied") => {
    const previous = getAnalyticsConsent();
    if (value === "granted") {
      if (previous !== "granted") grantAnalytics();
    } else {
      denyAnalytics();
    }
    setConsent(value);
    onChange(value);
    // Se um fornecedor já tinha sido carregado, o reload garante revogação
    // efetiva em vez de apenas parar nossos eventos customizados.
    if (value === "denied" && previous === "granted") window.location.reload();
  };

  if (consent !== "unknown") {
    return <button type="button" className="analytics-preferences-button" onClick={() => setConsent("unknown")}>Preferências de privacidade</button>;
  }

  return <aside className="analytics-choice" aria-label="Preferências de privacidade">
    <div><strong>Você escolhe como navegar.</strong><p>Podemos medir o uso da página para melhorá-la? Seu cadastro funciona com qualquer escolha.</p></div>
    <div className="analytics-actions"><button type="button" onClick={() => choose("granted")}>Permitir medição</button><button type="button" onClick={() => choose("denied")}>Agora não</button></div>
  </aside>;
}

function BrandHeader() {
  const { pathname, search } = useLocation();
  const home = pathname === "/" ? "" : `/${search}`;
  return <header className="prelaunch-header"><Link className="brand" to={{ pathname: "/", search }} aria-label="Carro Chefe — início"><img src="/assets/logos/base_no-background.png" alt="" width="56" height="56" /><span><strong>Carro Chefe</strong><small>Sabor que lidera</small></span></Link><nav aria-label="Navegação principal"><a href={`${home}#chefao`}>O Chefão</a><a href={`${home}#como-funciona`}>Como funciona</a><a className="header-cta" href={`${home}#cadastro`}>Quero ser avisado <span aria-hidden="true">↗</span></a></nav></header>;
}

function PrelaunchLanding() {
  const [, setAnalyticsConsent] = useState<AnalyticsConsent>(() => getAnalyticsConsent());
  const { search } = useLocation();
  const attribution = useMemo(() => getAttribution(), [search]);
  const bannerVip = isBannerVipCampaign(attribution);
  const copy = bannerVip ? campaignContent.vip : campaignContent.direct;

  useEffect(() => {
    const consent = getAnalyticsConsent();
    if (consent === "granted") loadAnalyticsVendors();
    if (attribution.ccQr) trackOnce("qr_scan", { hasProductMedia: true });
    trackOnce("landing_view", { hasProductMedia: true });
  }, [attribution]);

  return <div className="prelaunch-shell"><a className="skip" href="#cadastro">Pular para o cadastro</a><BrandHeader />
    <main>
      <section className="prelaunch-hero" aria-labelledby="hero-title">
        <div className="hero-message">
          <span className="opening-badge"><span aria-hidden="true" />{bannerVip ? "Convite exclusivo pelo QR · Pré-inauguração" : "Pré-inauguração · Campo Grande"}</span>
          <h1 id="hero-title">Esse é o <em>Chefão.</em></h1>
          <p className="hero-lead">Espeto na parrilla, baguete e um recheio de respeito.</p>
        </div>
        <figure className="hero-product">
          <div className="product-stage"><img src="/assets/products/chefao-recorte-v02.webp" srcSet="/assets/products/chefao-recorte-v02-800.webp 800w, /assets/products/chefao-recorte-v02.webp 1659w" sizes="(max-width: 760px) calc(100vw - 24px), (max-width: 1200px) calc(100vw - 96px), 1100px" width="1659" height="522" fetchPriority="high" alt="Chefão inteiro: baguete recheada com espetos na parrilla, cheddar, alface, tomate, cebola-roxa e batata palha." /></div>
          <figcaption className="product-highlights"><span><strong>30 cm</strong> de baguete</span><span><strong>2 espetos</strong> na parrilla</span><span>Recheio <strong>de respeito</strong></span></figcaption>
        </figure>
        <div className="hero-invitation">
          {bannerVip && <aside className="campaign-invitation" aria-label="Seu convite pelo QR"><span className="campaign-badge">{campaignContent.vip.badge}</span><h2>{campaignContent.vip.title}</h2><p>{campaignContent.vip.description}</p></aside>}
          <div className="hero-actions"><a className="button button-primary" href="#cadastro" onClick={() => track("signup_cta_click", { ctaVariant: "product_hero_v3_cutout", formPosition: "signup_section", hasProductMedia: true })}>{copy.cta} <span aria-hidden="true">↗</span></a><a className="text-link" href="#chefao">O que vem no Chefão <span aria-hidden="true">↓</span></a></div>
          <p className="hero-promise">{bannerVip ? <>Veio pelo banner? Entre na <strong>Lista dos Primeiros</strong> para receber a inauguração e os cupons e promoções exclusivas pelo WhatsApp.</> : <>Estamos preparando a inauguração. Entre na <strong>Lista dos Primeiros</strong> para receber as novidades pelo WhatsApp.</>}</p>
        </div>
      </section>
      <section className="product-section section-shell" id="chefao" aria-labelledby="product-title"><div className="product-intro"><span className="eyebrow">Conheça o Chefão</span><h2 id="product-title">Espeto na brasa.<br />Abraço de baguete.</h2><p>Nosso lanche de 30 cm junta dois espetos preparados na parrilla com maionese, cheddar, alface, tomate, cebola-roxa e batata palha.</p><p className="product-detail">Aquela combinação de pão, recheio e crocância para a hora da fome.</p></div><div className="product-features"><article><span className="feature-icon" aria-hidden="true">↔</span><div><h3>30 cm de baguete</h3><p>Espaço de sobra para o recheio.</p></div></article><article><span className="feature-icon" aria-hidden="true">♨</span><div><h3>Dois espetos na parrilla</h3><p>O sabor da brasa no centro do lanche.</p></div></article><article><span className="feature-icon" aria-hidden="true">+</span><div><h3>Do seu jeito</h3><p>Até dois adicionais gratuitos entre picles, requeijão cremoso, barbecue e maionese de bacon.</p></div></article></div></section>
      <section className="signup-section section-shell" id="cadastro" aria-labelledby="signup-title" tabIndex={-1}><div className="signup-intro"><span className="eyebrow">Entre na Lista dos Primeiros</span><h2 id="signup-title">A brasa vai acender.<br />A gente te avisa.</h2><p>Estamos preparando nossa lanchonete em Campo Grande. Deixe seu WhatsApp para saber quando chegar.</p><div className="expectation-list" id="como-funciona"><h3>Como funciona</h3><ol><li><span aria-hidden="true">1</span><div><strong>Você entra na lista</strong><p>É gratuito e só precisa do seu WhatsApp.</p></div></li><li><span aria-hidden="true">2</span><div><strong>Recebe a data de abertura</strong><p>Avisamos quando a inauguração estiver confirmada.</p></div></li><li><span aria-hidden="true">3</span><div><strong>{bannerVip ? "Fica por dentro dos cupons e promoções exclusivas" : "Fica por dentro das novidades"}</strong><p>{bannerVip ? "Promoções, cupons e outros benefícios. As regras de cada ação chegam pelo WhatsApp." : "Acompanhe a inauguração e as promoções da marca."}</p></div></li></ol></div></div><div className="signup-panel"><SignupForm key={search} /></div></section>
      <section className="faq-section section-shell" aria-labelledby="faq-title"><div><span className="eyebrow">Pra você chegar sabendo</span><h2 id="faq-title">Ficou com vontade?<br />Tire suas dúvidas.</h2></div><div className="faq-list"><details><summary>Já posso fazer um pedido?</summary><p>Ainda estamos em pré-inauguração. Entre na lista para receber a data de abertura e as informações para pedir quando começarmos.</p></details><details><summary>O cadastro é gratuito?</summary><p>Sim. Você só informa seu WhatsApp e escolhe receber nossas mensagens. Pode pedir para sair a qualquer momento pelo WhatsApp oficial.</p></details><details><summary>{copy.faqTitle}</summary><p>{copy.faqAnswer}</p></details><details><summary>Preciso seguir o Instagram?</summary><p>Não. Seu cadastro já basta para receber as novidades pelo WhatsApp. O Instagram é um convite para acompanhar os bastidores, se você quiser.</p></details></div></section>
      <section className="social-section section-shell"><div><span className="eyebrow">Pode chegar mais perto</span><h2>O primeiro encontro<br />pode ser nos bastidores.</h2><p>Conheça a preparação da nossa lanchonete e acompanhe o Carro Chefe no Instagram.</p></div><div className="social-actions"><a className="button button-secondary" href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>Ver @carrochefe_cg <span aria-hidden="true">↗</span></a><a className="text-link" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { section: "social" })}>Falar com a gente no WhatsApp ↗</a></div></section>
    </main>
    <footer className="prelaunch-footer"><div className="footer-brand"><img src="/assets/logos/base_no-background.png" alt="" /><span><strong>Carro Chefe</strong><small>Sabor que lidera</small></span></div><nav aria-label="Rodapé"><Link to={{ pathname: "/privacidade", search }} onClick={() => track("privacy_open")}>Privacidade</Link><a href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>Instagram</a><a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { section: "social" })}>WhatsApp</a></nav><small>© {new Date().getFullYear()} Carro Chefe</small></footer>
    <div className="privacy-controls"><AnalyticsChoice onChange={setAnalyticsConsent} /></div>
  </div>;
}

function Privacy() {
  const { search } = useLocation();
  useEffect(() => { trackOnce("privacy_open"); }, []);
  return <div className="legal-shell"><BrandHeader /><main className="legal-page"><span className="eyebrow">Versão operacional · pré-lançamento</span><h1>Aviso de Privacidade</h1><p className="legal-intro">Este aviso descreve a coleta usada na Lista dos Primeiros. O texto jurídico definitivo ainda passará por revisão antes de substituir esta versão operacional.</p>
    <section><h2>O que coletamos</h2><p>Para o cadastro, coletamos o número de WhatsApp informado, o aceite de comunicação, a versão deste aviso e, quando a visita veio de uma peça identificada, os códigos de campanha e QR. O primeiro nome não é obrigatório nesta etapa.</p></section>
    <section><h2>Para que usamos</h2><p>O WhatsApp é usado para comunicar novidades da inauguração, promoções, cupons e outros benefícios do Carro Chefe conforme o consentimento dado. Os códigos de campanha permitem entender qual peça física originou o cadastro e aplicar benefícios vinculados à campanha quando houver regra aprovada.</p></section>
    <section><h2>Analytics opcional</h2><p>Analytics não essencial só é ativado após sua escolha. Se você recusar, o cadastro continua funcionando. Eventos analíticos não recebem nome nem telefone; ferramentas externas configuradas para esta página também não devem receber esses dados.</p></section>
    <section><h2>Cancelamento e direitos</h2><p>Você pode pedir para deixar de receber mensagens pelo canal oficial de WhatsApp. Solicitações sobre acesso, correção ou eliminação de dados serão tratadas pelos canais oficiais do Carro Chefe, respeitando as obrigações legais aplicáveis.</p></section>
    <section><h2>Retenção e fornecedores</h2><p>Os dados serão mantidos somente pelo período necessário às finalidades informadas e às obrigações aplicáveis. Serviços de analytics, quando configurados e aceitos, podem atuar como fornecedores técnicos. Prazos definitivos, identificação jurídica completa do controlador e revisão de bases legais serão consolidados na versão jurídica final.</p></section>
    <Link className="back-link" to={{ pathname: "/", search }}>← Voltar para o pré-lançamento</Link></main></div>;
}

function App() {
  return <BrowserRouter><Routes><Route path="/" element={<PrelaunchLanding />} /><Route path="/welcome" element={<LandingRedirect />} /><Route path="/cardapio" element={<LandingRedirect />} /><Route path="/privacidade" element={<Privacy />} /><Route path="/termos" element={<Navigate to="/privacidade" replace />} /><Route path="*" element={<LandingRedirect />} /></Routes></BrowserRouter>;
}

function LandingRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/", search }} replace />;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
