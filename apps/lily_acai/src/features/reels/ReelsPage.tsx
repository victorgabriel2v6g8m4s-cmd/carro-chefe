import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CatalogProduct } from "../../api";
import { loadReelsCatalog } from "./catalog";
import { ReelSlide, type ReelSequence } from "./ReelSlide";

export function ReelsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycles, setCycles] = useState(1);
  const [feed, setFeed] = useState<HTMLDivElement | null>(null);
  const [sequence, setSequence] = useState<ReelSequence>("catalog");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const horizontalKeys = useRef<((direction: 1 | -1) => void) | null>(null);
  const sequenceLabel = sequence === "related" ? "Relacionados" : sequence === "catalog" ? "Catálogo" : "Aleatória";
  const items = useMemo(() => Array.from({ length: cycles }, (_, cycle) => products.map((product) => ({ product, key: `${cycle}:${product.id}` }))).flat(), [cycles, products]);
  const setFeedRef = useCallback((node: HTMLDivElement | null) => setFeed(node), []);
  const registerHorizontalKeys = useCallback((handler: ((direction: 1 | -1) => void) | null) => { horizontalKeys.current = handler; }, []);

  useEffect(() => {
    let alive = true;
    void loadReelsCatalog().then((rows) => { if (alive) setProducts(rows); }).catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "Não foi possível abrir os Reels."); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!feed || !items.length) return;
    const slides = Array.from(feed.querySelectorAll<HTMLElement>("[data-reel-index]"));
    const observer = new IntersectionObserver((entries) => {
      const mostVisible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (mostVisible) setActiveIndex(Number((mostVisible.target as HTMLElement).dataset.reelIndex));
    }, { root: feed, threshold: [0.45, 0.7, 0.95] });
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [feed, items.length]);

  useEffect(() => {
    if (!feed || !items.length) return;
    const sentinel = feed.querySelector(".reels-feed-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setCycles((current) => current + 1); }, { root: feed, rootMargin: "100% 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed, items.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("button, a, input, select, textarea, [contenteditable=true]")) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const target = Math.max(0, activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        feed?.querySelector<HTMLElement>(`[data-reel-index="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        horizontalKeys.current?.(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, feed]);

  function cycleSequence() {
    const next: ReelSequence = sequence === "related" ? "catalog" : sequence === "catalog" ? "random" : "related";
    const currentProduct = items[activeIndex]?.product;
    if (next === "random") {
      const shuffled = [...products];
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swapAt = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapAt]] = [shuffled[swapAt], shuffled[index]];
      }
      if (shuffled.length > 1 && shuffled[0]?.id === currentProduct?.id) [shuffled[0], shuffled[1]] = [shuffled[1]!, shuffled[0]!];
      setProducts(shuffled);
    } else if (next === "catalog") {
      void loadReelsCatalog().then(setProducts).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o catálogo."));
    } else if (currentProduct) {
      setProducts((current) => [...current].sort((a, b) => Number(b.category.id === currentProduct.category.id) - Number(a.category.id === currentProduct.category.id)));
    }
    setSequence(next);
    setCycles(1);
    setActiveIndex(0);
    feed?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!products.length) return <section className="reels-page reels-empty"><h1>Reels</h1>{error ? <p role="alert">{error}</p> : <p>Os produtos aparecerão aqui quando o catálogo estiver disponível.</p>}</section>;

  return <section className="reels-page">
    <div ref={setFeedRef} className="reels-feed" aria-label="Feed de produtos Reels">
      {items.map(({ product, key }, index) => <ReelSlide key={key} product={product} index={index} sequence={sequence} sequenceLabel={sequenceLabel} active={index === activeIndex} total={items.length} feed={feed} onCycleSequence={cycleSequence} onExit={() => navigate(-1)} onRegisterHorizontalKeys={registerHorizontalKeys} />)}
      <div className="reels-feed-sentinel" aria-hidden="true" />
    </div>
  </section>;
}
