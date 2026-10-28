import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Heart, ListOrdered, MessageCircle, Share2, ShoppingCart, Shuffle, Volume2, VolumeX, X } from "lucide-react";
import { getLilySession, postLilyVipAction, type CatalogProduct } from "../../api";
import { useCart } from "../cart/CartContext";
import { trackLilyAnalytics } from "../../analytics";

const placeholder = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;
export type ReelSequence = "related" | "catalog" | "random";

type ReelSlideProps = {
  product: CatalogProduct;
  index: number;
  sequence: ReelSequence;
  sequenceLabel: string;
  active: boolean;
  total: number;
  feed: HTMLDivElement | null;
  onCycleSequence: () => void;
  onExit: () => void;
  onRegisterHorizontalKeys: (handler: ((direction: 1 | -1) => void) | null) => void;
};

export function ReelSlide({ product, index, sequence, sequenceLabel, active, total, feed, onCycleSequence, onExit, onRegisterHorizontalKeys }: ReelSlideProps) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [cartFeedback, setCartFeedback] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState<string[]>(() => readIds("cooklily:saved-reels"));
  const [liked, setLiked] = useState<string[]>(() => readIds("cooklily:liked-reels"));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number; moved: boolean; pointerType: string } | null>(null);
  const suppressClick = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const navigate = useNavigate();
  const cart = useCart();
  const media = [product.cover, ...product.gallery].filter((item, at, all): item is NonNullable<typeof item> => Boolean(item) && all.findIndex((candidate) => candidate?.id === item?.id) === at);
  const activeMedia = media[mediaIndex];
  const isVideo = Boolean(activeMedia && /\.(mp4|webm)(\?|$)/i.test(activeMedia.url));
  const needsCustomization = product.configurationType !== "fixed" || product.minimumAddonUnits > 0 || product.soldOut || product.variants.length === 0;

  useEffect(() => { try { localStorage.setItem("cooklily:saved-reels", JSON.stringify(saved)); } catch { /* Local storage may be disabled. */ } }, [saved]);
  useEffect(() => { try { localStorage.setItem("cooklily:liked-reels", JSON.stringify(liked)); } catch { /* Local storage may be disabled. */ } }, [liked]);
  useEffect(() => { setMediaIndex(0); setPlaying(true); setCurrentTime(0); setDuration(0); setExpanded(false); }, [product.id]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed ? 2 : 1;
    if (active && playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [active, activeMedia?.id, playing, speed]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timeout); }, [toast]);
  useEffect(() => () => { if (holdTimer.current !== null) window.clearTimeout(holdTimer.current); }, []);
  useEffect(() => {
    const handler = (direction: 1 | -1) => moveMedia(direction);
    if (active) onRegisterHorizontalKeys(handler);
    return () => { if (active) onRegisterHorizontalKeys(null); };
  }, [active, mediaIndex, media.length, onRegisterHorizontalKeys]);
  useEffect(() => {
    if (!active || !product.vipEarlyAccess) return;
    void getLilySession().then((session) => postLilyVipAction("launch-view", session.csrfToken, { productId: product.id })).catch(() => undefined);
  }, [active, product.id, product.vipEarlyAccess]);

  function moveMedia(direction: 1 | -1) {
    if (direction > 0 && mediaIndex < media.length - 1) setMediaIndex((current) => current + 1);
    else if (direction < 0 && mediaIndex > 0) setMediaIndex((current) => current - 1);
    else if (direction > 0) navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`);
    else onExit();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, .reels-comments-sheet")) return;
    suppressClick.current = false;
    pointerStart.current = { x: event.clientX, y: event.clientY, moved: false, pointerType: event.pointerType };
    if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
    if (isVideo && event.clientY < event.currentTarget.getBoundingClientRect().top + 120) holdTimer.current = window.setTimeout(() => setSpeed(true), 350);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) start.moved = true;
    if (Math.abs(dx) > Math.abs(dy)) setDragX(Math.max(-42, Math.min(42, dx * 0.16)));
    if (Math.abs(dy) > 12 && holdTimer.current !== null) { window.clearTimeout(holdTimer.current); holdTimer.current = null; setSpeed(false); }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setSpeed(false);
    const start = pointerStart.current;
    pointerStart.current = null;
    setDragX(0);
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) moveMedia(dx < 0 ? 1 : -1);
    else if (start.pointerType === "mouse" && Math.abs(dy) > 70 && feed) {
      const targetIndex = Math.max(0, Math.min(total - 1, index + (dy < 0 ? 1 : -1)));
      feed.querySelector<HTMLElement>(`[data-reel-index="${targetIndex}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    suppressClick.current = start.moved;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  function togglePlaybackFromMedia(event: ReactMouseEvent<HTMLElement>) {
    if (suppressClick.current) return;
    if ((event.target as HTMLElement).closest("button, a, input, .reels-comments-sheet")) return;
    if ((event.target as HTMLElement).closest("video") && isVideo) setPlaying((value) => !value);
  }

  function toggleSaved() {
    setSaved((current) => {
      const wasSaved = current.includes(product.id);
      setToast(wasSaved ? "Produto removido dos salvos." : "Produto salvo neste dispositivo.");
      return wasSaved ? current.filter((id) => id !== product.id) : [...current, product.id];
    });
  }

  function toggleLiked() {
    setLiked((current) => {
      const wasLiked = current.includes(product.id);
      setToast(wasLiked ? "Curtida removida." : "Você curtiu este produto.");
      return wasLiked ? current.filter((id) => id !== product.id) : [...current, product.id];
    });
  }

  async function share() {
    const url = `${window.location.origin}/lilyacai/cardapio?produto=${encodeURIComponent(product.slug)}`;
    try { await navigator.share({ title: product.displayName, text: product.description ?? product.displayName, url }); }
    catch { try { await navigator.clipboard.writeText(url); setToast("Link do produto copiado."); } catch { setToast("Não foi possível compartilhar agora."); } }
  }

  async function addToCart() {
    if (needsCustomization) { navigate(`/cardapio?produto=${encodeURIComponent(product.slug)}`); return; }
    try {
      const variant = product.variants.find((item) => item.isAvailable) ?? product.variants[0];
      if (!variant) throw new Error("Este produto não tem uma opção disponível no momento.");
      const { configureLilyItem } = await import("../../api");
      const quote = await configureLilyItem({ productId: product.id, sizeMl: variant.sizeMl, flavorIds: product.flavors.map(({ id }) => id), addons: [] });
      cart.addItem({ kind: "product", productId: quote.product.id, productName: quote.product.name, variantId: quote.variant.id, variantName: quote.variant.name, sizeMl: quote.sizeMl, flavorIds: quote.flavors.map(({ id }) => id), flavors: quote.flavors, addons: quote.addons, allergens: quote.allergens, configurationHash: quote.configurationHash, unitPriceCents: quote.totalPriceCents });
      trackLilyAnalytics("add_to_cart", { surface: "reels", productSlug: product.slug, variantSizeMl: variant.sizeMl, addonCount: 0, itemCount: 1 });
      setCartFeedback(true);
      setToast("Adicionado ao carrinho");
      window.setTimeout(() => setCartFeedback(false), 550);
    } catch (cause) { setToast(cause instanceof Error ? cause.message : "Não foi possível adicionar esse produto."); }
  }

  if (!active) return <article className="reels-stage reels-stage-placeholder" data-reel-index={index} aria-label={`Próximo produto: ${product.displayName}`}>
    {product.cover && <img src={product.cover.url} alt="" loading="lazy" />}
    <span>{product.displayName}</span>
  </article>;

  return <article className={`reels-stage${product.vipLocked ? " is-vip-locked" : ""}`} data-reel-index={index} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={togglePlaybackFromMedia} style={{ transform: `translateX(${dragX}px) scale(${1 - Math.min(0.06, Math.abs(dragX) / 1800)})` }} aria-label="Reels de produtos: deslize para cima ou para baixo para mudar de produto">
    {activeMedia ? isVideo ? <video ref={videoRef} key={activeMedia.id} src={activeMedia.url} poster={product.cover?.url} muted={muted} loop playsInline aria-label={activeMedia.altText || product.displayName} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} /> : <img key={activeMedia.id} src={activeMedia.url} alt={activeMedia.altText || product.displayName} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = placeholder; }} /> : <img src={placeholder} alt="" />}
    {product.vipEarlyAccess && <span className="reels-vip-tag">✦ VIP</span>}
    <header className="reels-top-controls"><button className="reels-icon-button" type="button" onClick={onExit} aria-label="Sair dos Reels"><ArrowLeft /></button><h2 className="sr-only">{product.displayName}</h2><div className="reels-media-dots" role="progressbar" aria-label="Mídia do produto" aria-valuemin={1} aria-valuemax={media.length} aria-valuenow={mediaIndex + 1}>{media.map((item, itemIndex) => <span key={item.id} className={itemIndex === mediaIndex ? "is-current" : undefined} />)}</div><button className="reels-icon-button" type="button" onClick={onCycleSequence} aria-label={`Mudar sequência. Atual: ${sequenceLabel}`} title={`Sequência: ${sequenceLabel}`}>{sequence === "catalog" ? <ListOrdered /> : <Shuffle />}</button><button className="reels-icon-button reels-sound-button" type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Silenciar"} title={muted ? "Ativar som" : "Silenciar"}>{muted ? <VolumeX /> : <Volume2 />}</button></header>
    {!product.vipLocked && <aside className="reels-actions" aria-label="Ações do produto"><button type="button" onClick={toggleLiked} aria-label={liked.includes(product.id) ? "Descurtir produto" : "Curtir produto"} aria-pressed={liked.includes(product.id)}><Heart fill={liked.includes(product.id) ? "currentColor" : "none"} /></button><button type="button" onClick={toggleSaved} aria-label={saved.includes(product.id) ? "Remover dos salvos" : "Salvar produto"} aria-pressed={saved.includes(product.id)}><Bookmark fill={saved.includes(product.id) ? "currentColor" : "none"} /></button><button type="button" onClick={share} aria-label="Compartilhar produto"><Share2 /></button><button type="button" onClick={() => setCommentsOpen(true)} aria-label="Abrir comentários"><MessageCircle /></button><button className={cartFeedback ? "is-added" : undefined} type="button" onClick={() => void addToCart()} aria-label={needsCustomization ? "Escolher opções e adicionar ao carrinho" : "Adicionar ao carrinho"}><ShoppingCart /></button></aside>}
    <div className="reels-product-info"><span className="eyebrow">{product.vipLocked ? "Lançamento" : product.category.name}</span><h3>{product.displayName}</h3>{product.description && <p className={expanded ? "is-expanded" : undefined}>{product.description}</p>}{product.description && product.description.length > 100 && <button className="reels-more-button" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "Ver menos" : "Ver mais"}</button>}{isVideo && !playing && <input className="reels-timeline" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { const time = Number(event.currentTarget.value); setCurrentTime(time); if (videoRef.current) videoRef.current.currentTime = time; }} aria-label="Linha do tempo do vídeo" />}{product.vipLocked && <button type="button" className="button primary" onClick={() => navigate("/perfil")}>Conheça o acesso VIP</button>}</div>
    {toast && <p role="status" className="reels-toast">{toast}</p>}
    {commentsOpen && <div className="reels-comments-backdrop" onClick={() => setCommentsOpen(false)}><section className="reels-comments-sheet" role="dialog" aria-modal="true" aria-labelledby={`reels-comments-title-${index}`} onClick={(event) => event.stopPropagation()}><header><h3 id={`reels-comments-title-${index}`}>Comentários</h3><button className="reels-icon-button" type="button" onClick={() => setCommentsOpen(false)} aria-label="Fechar comentários"><X /></button></header><p>Ainda não há comentários para este produto.</p></section></div>}
  </article>;
}

function readIds(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; }
  catch { return []; }
}
