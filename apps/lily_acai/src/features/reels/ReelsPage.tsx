import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getLilySession, postLilyVipAction, type CatalogProduct } from "../../api";
import { useCart } from "../cart/CartContext";
import { trackLilyAnalytics } from "../../analytics";
import { loadReelsCatalog } from "./catalog";

const placeholder = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;
type Sequence = "related" | "catalog" | "random";

export function ReelsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [index, setIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [sequence, setSequence] = useState<Sequence>("catalog");
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(false);
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("cooklily:saved-reels") ?? "[]") as string[]; } catch { return []; } });
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [dragX, setDragX] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const cart = useCart();
  const navigate = useNavigate();
  const product = products[index];
  const media = product ? [product.cover, ...product.gallery].filter((item, mediaAt, all): item is NonNullable<typeof item> => Boolean(item) && all.findIndex((candidate) => candidate?.id === item?.id) === mediaAt) : [];
  const activeMedia = media[mediaIndex];
  const sequenceLabel = sequence === "related" ? "Relacionados" : sequence === "catalog" ? "Catálogo" : "Aleatória";

  const nextProduct = useCallback((direction: 1 | -1) => { setIndex((current) => Math.max(0, Math.min(products.length - 1, current + direction))); setMediaIndex(0); }, [products.length]);
  useEffect(() => { let alive = true; void loadReelsCatalog().then((rows) => { if (alive) setProducts(rows); }).catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "Não foi possível abrir os Reels."); }); return () => { alive = false; }; }, []);
  useEffect(() => { try { localStorage.setItem("cooklily:saved-reels", JSON.stringify(saved)); } catch { /* local storage can be unavailable in private browsing */ } }, [saved]);
  useEffect(() => { setMediaIndex(0); setPlaying(true); }, [index]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(timeout); }, [toast]);
  useEffect(() => () => { if (holdTimer.current !== null) window.clearTimeout(holdTimer.current); }, []);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "ArrowDown") { event.preventDefault(); nextProduct(1); } else if (event.key === "ArrowUp") { event.preventDefault(); nextProduct(-1); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [nextProduct]);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, video")) return;
    pointerStart.current = { x: event.clientX, y: event.clientY }; setDragX(0);
    if (event.clientY < event.currentTarget.getBoundingClientRect().top + 120) holdTimer.current = window.setTimeout(() => setSpeed(true), 350);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLElement>) { if (!pointerStart.current) return; setDragX(event.clientX - pointerStart.current.x); }
  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current); holdTimer.current = null; setSpeed(false);
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x, dy = event.clientY - pointerStart.current.y; pointerStart.current = null; setDragX(0);
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) { nextProduct(dy < 0 ? 1 : -1); return; }
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && mediaIndex < media.length - 1) setMediaIndex((current) => current + 1);
      else if (dx < 0) navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`);
      else if (mediaIndex > 0) setMediaIndex((current) => current - 1);
      else navigate(-1);
    }
  }
  function togglePlaybackFromMedia(event: ReactMouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, .reels-actions, .reels-product-info, .reels-top-controls")) return;
    if ((event.target as HTMLElement).closest("video")) setPlaying((value) => !value);
  }
  function handleLike() { setToast("Curtidas ainda não estão disponíveis."); }
  function handleSave() { setSaved((current) => { const wasSaved = current.includes(product.id); setToast(wasSaved ? "Item removido dos salvos." : "Item salvo neste dispositivo."); return wasSaved ? current.filter((id) => id !== product.id) : [...current, product.id]; }); }
  async function addToCart() {
    if (product.configurationType !== "fixed" || product.variants.length !== 1 || product.flavors.some((flavor) => flavor.premium) || product.minimumAddonUnits > 0) { navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`); return; }
    try {
      const variant = product.variants[0];
      const { configureLilyItem } = await import("../../api");
      const quote = await configureLilyItem({ productId: product.id, sizeMl: variant.sizeMl, flavorIds: product.flavors.map(({ id }) => id), addons: [] });
      cart.addItem({ kind: "product", productId: quote.product.id, productName: quote.product.name, variantId: quote.variant.id, variantName: quote.variant.name, sizeMl: quote.sizeMl, flavorIds: quote.flavors.map(({ id }) => id), flavors: quote.flavors, addons: quote.addons, allergens: quote.allergens, configurationHash: quote.configurationHash, unitPriceCents: quote.totalPriceCents });
      trackLilyAnalytics("add_to_cart", { surface: "reels", productSlug: product.slug, variantSizeMl: variant.sizeMl, addonCount: 0, itemCount: 1 }); setToast("Adicionado ao carrinho"); window.setTimeout(() => navigate("/carrinho"), 250);
    } catch (cause) { setToast(cause instanceof Error ? cause.message : "Não foi possível adicionar esse produto."); }
  }
  async function share() { try { await navigator.share({ title: product.displayName, text: product.description ?? product.displayName, url: `${window.location.origin}/lilyacai/cardapio?produto=${encodeURIComponent(product.slug)}` }); } catch { try { await navigator.clipboard.writeText(`${window.location.origin}/lilyacai/cardapio?produto=${encodeURIComponent(product.slug)}`); setToast("Link do produto copiado."); } catch { setToast("Não foi possível compartilhar agora."); } } }
  function cycleSequence() { setSequence((current) => { const next = current === "related" ? "catalog" : current === "catalog" ? "random" : "related"; if (next === "random" && products.length > 1) { const order = [...products]; for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } if (order[0]?.id === product?.id) [order[0], order[1]] = [order[1]!, order[0]!]; setProducts(order); setIndex(0); } else if (next === "catalog") { void loadReelsCatalog().then(setProducts).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o catálogo.")); setIndex(0); } else if (next === "related" && product) { setProducts((currentProducts) => [...currentProducts].sort((a, b) => Number(b.category.id === product.category.id) - Number(a.category.id === product.category.id))); setIndex(0); } setToast(`Sequência: ${next === "related" ? "relacionados" : next === "catalog" ? "catálogo" : "aleatória"}`); return next; }); }
  function reportVipView() { if (product.vipEarlyAccess) void getLilySession().then((session) => postLilyVipAction("launch-view", session.csrfToken, { productId: product.id })).catch(() => undefined); }

  if (!products.length) return <section className="reels-page reels-empty"><button className="reels-icon-button reels-exit" type="button" onClick={() => navigate(-1)} aria-label="Sair dos Reels">×</button><h1>Reels</h1>{error ? <p className="error" role="alert">{error}</p> : <p>Os produtos aparecerão aqui quando o catálogo estiver disponível.</p>}</section>;
  return <section className="reels-page">
    <div className={`reels-stage${product.vipLocked ? " is-vip-locked" : ""}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerUp} onPointerEnter={reportVipView} onClick={togglePlaybackFromMedia} style={{ transform: `translateX(${Math.max(-42, Math.min(42, dragX * 0.16))}px) scale(${1 - Math.min(0.06, Math.abs(dragX) / 1800)})`, backgroundColor: dragX > 0 ? "#a93f66" : dragX < 0 ? "#3f2432" : undefined }} aria-label="Reels de produtos: deslize para cima ou para baixo para mudar de produto">
      {activeMedia ? activeMedia.url.endsWith(".mp4") || activeMedia.url.endsWith(".webm") ? <ReelMedia key={activeMedia.id} url={activeMedia.url} poster={product.cover?.url} alt={activeMedia.altText || product.displayName} playing={playing && !product.vipLocked} muted={muted} speed={speed} /> : <img key={activeMedia.id} src={activeMedia.url} alt={activeMedia.altText || product.displayName} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = placeholder; }} /> : <img src={placeholder} alt="" />}
      <header className="reels-top-controls"><button className="reels-icon-button" type="button" onClick={() => navigate(-1)} aria-label="Sair dos Reels">‹</button><h1 className="sr-only">Reels</h1><div className="reels-media-dots">{media.map((item, at) => <button key={item.id} aria-label={`Mídia ${at + 1} de ${media.length}`} aria-current={at === mediaIndex} onClick={() => setMediaIndex(at)} />)}</div><button className="reels-icon-button reels-sequence-button" type="button" onClick={cycleSequence} aria-label={`Mudar sequência. Atual: ${sequenceLabel}`} title={`Sequência: ${sequenceLabel}`}><SequenceIcon /></button><button className="reels-icon-button reels-sound-button" type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Silenciar"} title={muted ? "Ativar som" : "Silenciar"}><SoundIcon muted={muted} /></button></header>
      {product.vipEarlyAccess && <span className="reels-vip-tag">✦ VIP</span>}
      {!product.vipLocked && <aside className="reels-actions" aria-label="Ações do produto"><button type="button" onClick={handleLike} aria-label="Curtir">♡</button><button type="button" onClick={handleSave} aria-label={saved.includes(product.id) ? "Remover dos salvos" : "Salvar"}>{saved.includes(product.id) ? "♥" : "☆"}</button><button type="button" onClick={share} aria-label="Compartilhar">↗</button><button type="button" onClick={() => navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`)} aria-label="Personalizar produto">＋</button><button type="button" onClick={() => void addToCart()} aria-label="Adicionar ao carrinho">🛒</button></aside>}
      <div className="reels-product-info"><span className="eyebrow">{product.vipLocked ? "Lançamento" : product.category.name}</span><h2>{product.displayName}</h2>{product.description && <p>{product.description}</p>}{product.vipLocked ? <button type="button" className="button primary" onClick={() => navigate("/perfil")}>Conheça o acesso VIP</button> : <button type="button" className="button primary" onClick={() => navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`)}>Personalizar e pedir</button>}</div>
      <button className="reels-nav reels-nav-up" onClick={() => nextProduct(-1)} disabled={index === 0} aria-label="Produto anterior">⌃</button><button className="reels-nav reels-nav-down" onClick={() => nextProduct(1)} disabled={index >= products.length - 1} aria-label="Próximo produto">⌄</button>
    </div>{toast && <p role="status" className="reels-toast">{toast}</p>}{products.length > 1 && <p className="reels-count">{index + 1} de {products.length}</p>}
  </section>;
}

function SoundIcon({ muted }: { muted: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />{muted ? <path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <><path d="M15 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}</svg>;
}

function SequenceIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3 21 7l-4 4M3 7h18M7 21l-4-4 4-4m14 4H3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ReelMedia({ url, poster, alt, playing, muted, speed }: { url: string; poster?: string; alt: string; playing: boolean; muted: boolean; speed: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { const video = ref.current; if (!video) return; video.playbackRate = speed ? 2 : 1; if (playing) void video.play().catch(() => undefined); else video.pause(); }, [playing, speed, url]);
  return <video ref={ref} src={url} poster={poster} muted={muted} loop playsInline aria-label={alt} />;
}
