import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./styles.css";

const whatsapp = "https://wa.me/5567992046721";
const instagram = "https://instagram.com/carrochefe_cg";

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <><a className="skip" href="#conteudo">Pular para o conteúdo</a><header className="site-header"><Link className="site-brand" to="/welcome"><img src="/assets/brand/logo-base.png" alt="" /><span><strong>Carro Chefe</strong><small>Sabor que lidera</small></span></Link><nav aria-label="Principal"><a href={location.pathname === "/welcome" ? "#cardapio" : "/welcome#cardapio"}>Cardápio</a><a href={location.pathname === "/welcome" ? "#experiencia" : "/welcome#experiencia"}>Experiência</a><a href={instagram}>Instagram</a></nav><Link className="order-button" to="/cardapio">Fazer pedido</Link></header><main id="conteudo">{children}</main><footer className="site-footer"><div className="footer-brand"><img src="/assets/brand/logo-base.png" alt="Carro Chefe" /><p>Sabor de parrilla, alma de esquina.</p></div><div><small>Fale com a gente</small><a href={whatsapp}>WhatsApp (67) 9 9204-6721</a><a href={instagram}>@carrochefe_cg</a></div><div><small>Informações</small><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos</Link></div><p className="copyright">© {new Date().getFullYear()} Carro Chefe</p></footer></>;
}

function Welcome() {
  return <Layout><section className="welcome-hero"><div className="hero-copy"><span className="kicker">Parrilla de esquina · Campo Grande</span><h1>O lanche que<br /><em>chega liderando.</em></h1><p>Baguete com gergelim, espeto saindo da brasa e aquela montagem que não passa despercebida.</p><div className="hero-actions"><Link className="primary" to="/cardapio">Quero pedir</Link><a className="secondary" href="#cardapio">Conhecer o cardápio</a></div></div><div className="hero-emblem" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><img src="/assets/brand/logo-base.png" alt="" /><span>BRASA · PÃO · MOLHO ·</span></div><div className="scroll-note">Role para descobrir <i /></div></section>
    <section className="manifesto" id="experiencia"><span>Não é só um espeto.</span><h2>É a brasa virando<br />o protagonista.</h2><div><p>Nosso parrilheiro cuida do fogo, da carne e da montagem ali, diante dos olhos. O cheiro chama. A primeira mordida confirma.</p><strong>Feito na hora.<br />Com presença.</strong></div></section>
    <section className="menu-story" id="cardapio"><div className="menu-intro"><span className="kicker">Escolha seu tamanho</span><h2>Do direto ao ponto<br />até o <em>Chefão.</em></h2><p>Você escolhe o espeto. A gente transforma em assinatura.</p></div><div className="menu-cards"><article><small>15 cm</small><h3>Carro-Chefe</h3><p>Baguete com gergelim, maionese e seu espeto preferido. Na versão com cheddar, ganha aquela camada cremosa.</p><ul><li>Carne bovina</li><li>Frango</li><li>Medalhão</li><li>Linguiça</li><li>Queijo coalho</li></ul></article><article className="chief-card"><span>O maior da casa</span><small>30 cm</small><h3>Chefão</h3><p>Dois espetos à escolha, cheddar, salada, cebola roxa e batata palha. Complete com até dois adicionais da casa.</p><ul><li>Picles</li><li>Catupiry</li><li>Barbecue</li><li>Maionese de bacon</li></ul></article><article><small>Prato completo</small><h3>Espeto Completo</h3><p>Arroz, vinagrete, mandioca, farofa temperada, espeto e queijo coalho. O clássico servido como refeição.</p><ul><li>Refrigerantes</li><li>Sucos naturais</li><li>Cervejas</li></ul></article></div><Link className="menu-cta" to="/cardapio">Abrir cardápio para pedir <span>→</span></Link></section>
    <section className="parrilla"><div><span className="kicker">Nosso palco</span><h2>Madeira, ouro fosco<br />e fogo aceso.</h2><p>Um quiosque com personalidade colonial, feito para que o preparo participe da experiência. Da calçada, você acompanha a parrilla e sente o ritmo da casa.</p></div><div className="parrilla-art" aria-label="Ilustração abstrata da parrilla"><div className="flame flame-a" /><div className="flame flame-b" /><div className="grill-lines" /></div></section>
    <section className="social-call"><span className="kicker">Acompanhe o fogo</span><h2>Os bastidores começam antes da inauguração.</h2><p>Novidades, testes, promoções e os primeiros lanches.</p><div><a className="primary" href={instagram}>Seguir no Instagram</a><a className="secondary" href={whatsapp}>Chamar no WhatsApp</a></div></section>
  </Layout>;
}

function MenuBridge() {
  return <Layout><section className="simple-page menu-page"><span className="kicker">Pedido digital</span><h1>O cardápio está sendo ligado à operação.</h1><p>Este endereço será ocupado pelo sistema de pedidos do Carro Chefe. Durante a configuração, fale diretamente com a equipe pelo WhatsApp.</p><a className="primary" href={whatsapp}>Pedir pelo WhatsApp</a><Link className="secondary" to="/welcome#cardapio">Ver os destaques</Link><aside><strong>Integração ERP</strong><span>O catálogo, disponibilidade, preço e pagamento virão da fonte oficial, sem duplicar dados neste site.</span></aside></section></Layout>;
}

function Legal({ kind }: { kind: "privacidade" | "termos" }) {
  return <Layout><section className="simple-page"><span className="kicker">Documento em preparação</span><h1>{kind === "privacidade" ? "Política de Privacidade" : "Termos de Uso"}</h1><p>O texto jurídico definitivo será publicado antes da coleta de pedidos e dados de clientes. Nenhuma política fictícia foi inserida nesta versão de fundação.</p><Link className="secondary" to="/welcome">Voltar ao início</Link></section></Layout>;
}

function App() { return <BrowserRouter><Routes><Route path="/" element={<Navigate to="/welcome" replace />} /><Route path="/welcome" element={<Welcome />} /><Route path="/cardapio" element={<MenuBridge />} /><Route path="/privacidade" element={<Legal kind="privacidade" />} /><Route path="/termos" element={<Legal kind="termos" />} /><Route path="*" element={<Navigate to="/welcome" replace />} /></Routes></BrowserRouter>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
