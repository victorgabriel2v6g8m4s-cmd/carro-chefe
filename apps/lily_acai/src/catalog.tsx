import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  configureLilyCombo,
  configureLilyItem,
  getLilyCatalog,
  getLilyComboBuilder,
  type CatalogPayload,
  type CatalogProduct,
  type ComboBuilderPayload
} from "./api";
import { useCart } from "./features/cart/CartContext";

const brandPlaceholder = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function minimumPrice(product: CatalogProduct) {
  const values = [
    ...product.variants.map((variant) => variant.priceCents),
    ...product.mixTiers.map((tier) => tier.priceCents)
  ];
  return values.length ? Math.min(...values) : 0;
}

function ProductImage({ product, onOpen }: { product: CatalogProduct; onOpen?: () => void }) {
  const src = product.cover?.url ?? brandPlaceholder;
  const alt = product.cover?.altText ?? `${product.displayName} — imagem temporária CookLily`;
  return <button className="catalog-image-button" type="button" onClick={onOpen} aria-label={`Ampliar imagem de ${product.displayName}`}>
    <img src={src} alt={alt} loading="lazy" />
    {!product.cover && <span className="placeholder-label">Foto em breve</span>}
  </button>;
}

function ProductConfigurator({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const cart = useCart();
  const availableVariants = product.variants.filter((variant) => variant.isAvailable);
  const [sizeMl, setSizeMl] = useState(availableVariants[0]?.sizeMl ?? product.variants[0]?.sizeMl ?? 300);
  const [flavorIds, setFlavorIds] = useState<string[]>(
    product.configurationType === "fixed" ? product.flavors.map((flavor) => flavor.id) : []
  );
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof configureLilyItem>> | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const quoteRequest = useRef(0);

  function toggleFlavor(id: string) {
    if (product.configurationType !== "lilymix") return;
    setAdded(false);
    setFlavorIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 3 ? [...current, id] : current);
  }

  function setAddon(id: string, quantity: number, max: number) {
    setAdded(false);
    setAddons((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(quantity, max);
      return next;
    });
  }

  const addonPayload = useMemo(
    () => Object.entries(addons).map(([addonId, quantity]) => ({ addonId, quantity })),
    [addons]
  );
  const flavorSignature = flavorIds.join("|");
  const addonSignature = addonPayload.map((item) => `${item.addonId}:${item.quantity}`).join("|");

  useEffect(() => {
    setQuote(null);
    setError("");

    if (product.soldOut || !sizeMl) return;
    if (product.configurationType === "lilymix" && flavorIds.length === 0) {
      setBusy(false);
      return;
    }

    const requestId = ++quoteRequest.current;
    const timer = window.setTimeout(() => {
      setBusy(true);
      configureLilyItem({
        productId: product.id,
        sizeMl,
        flavorIds,
        addons: addonPayload
      }).then((result) => {
        if (quoteRequest.current !== requestId) return;
        setQuote(result);
        setError("");
      }).catch((cause) => {
        if (quoteRequest.current !== requestId) return;
        setQuote(null);
        setError(cause instanceof Error ? cause.message : "Não foi possível validar esta combinação.");
      }).finally(() => {
        if (quoteRequest.current === requestId) setBusy(false);
      });
    }, 180);

    return () => window.clearTimeout(timer);
  // signatures intentionally make array/object changes deterministic
  }, [product.id, product.soldOut, product.configurationType, sizeMl, flavorSignature, addonSignature]);

  const selectedAddonUnits = Object.values(addons).reduce((sum, value) => sum + value, 0);

  function addToCart() {
    if (!quote) return;
    cart.addItem({
      kind: "product",
      productId: quote.product.id,
      productName: quote.product.name,
      variantId: quote.variant.id,
      variantName: quote.variant.name,
      sizeMl: quote.sizeMl,
      flavorIds: quote.flavors.map((flavor) => flavor.id),
      flavors: quote.flavors,
      addons: quote.addons,
      configurationHash: quote.configurationHash,
      unitPriceCents: quote.totalPriceCents
    });
    setAdded(true);
  }

  return <div className="product-modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="product-modal" role="dialog" aria-modal="true" aria-label={product.displayName}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
      <div className="product-modal-media">
        <ProductImage product={product} onOpen={() => setFullscreen(true)} />
      </div>
      <div className="product-modal-panel">
        <div className="product-modal-content">
          <span className="eyebrow">{product.category.parent?.name ?? product.category.name}</span>
          <h2>{product.displayName}</h2>
          {product.descriptiveName && <p className="product-descriptor">{product.descriptiveName}</p>}
          {product.description && <p>{product.description}</p>}
          {product.soldOut && <div className="soldout-banner">Esgotado no momento</div>}

          <fieldset className="config-group">
            <legend>Tamanho</legend>
            <div className="option-row">
              {product.variants.map((variant) => <button
                key={variant.id}
                type="button"
                className={`choice-chip ${sizeMl === variant.sizeMl ? "selected" : ""}`}
                disabled={!variant.isAvailable}
                onClick={() => { setSizeMl(variant.sizeMl); setAdded(false); }}
              >
                {variant.sizeMl} ml · {money(variant.priceCents)}
              </button>)}
            </div>
          </fieldset>

          {product.configurationType === "lilymix" && <fieldset className="config-group">
            <legend>Sabores <small>{flavorIds.length}/3</small></legend>
            <div className="option-row">
              {product.flavors.map((flavor) => <button
                key={flavor.id}
                type="button"
                className={`choice-chip ${flavorIds.includes(flavor.id) ? "selected" : ""}`}
                onClick={() => toggleFlavor(flavor.id)}
              >
                {flavor.name}{flavor.premium ? " +" : ""}
              </button>)}
            </div>
            <small>A compatibilidade e o preço são recalculados automaticamente pelo servidor.</small>
          </fieldset>}

          {product.addons.length > 0 && <fieldset className="config-group">
            <legend>Adicionais <small>{selectedAddonUnits}/4 porções</small></legend>
            <div className="addon-list">
              {product.addons.map((addon) => {
                const quantity = addons[addon.id] ?? 0;
                return <div className="addon-row" key={addon.id}>
                  <div><strong>{addon.name}</strong><small>+ {money(addon.priceCents)} por porção</small></div>
                  <div className="stepper">
                    <button type="button" onClick={() => setAddon(addon.id, quantity - 1, addon.individualLimit)} disabled={quantity === 0}>−</button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => setAddon(addon.id, quantity + 1, addon.individualLimit)}
                      disabled={quantity >= addon.individualLimit || selectedAddonUnits >= 4}>+</button>
                  </div>
                </div>;
              })}
            </div>
          </fieldset>}

          {error && <p className="error" role="alert">{error}</p>}
          {busy && <p className="config-status" role="status">Atualizando preço e validação...</p>}
          {!busy && !quote && product.configurationType === "lilymix" && flavorIds.length === 0
            && <p className="config-status">Escolha pelo menos um sabor para ver o preço final.</p>}
        </div>

        <div className="product-modal-footer">
          <div className="modal-price">
            <small>{error ? "Configuração inválida" : busy ? "Calculando..." : quote ? "Total" : "Configure o item"}</small>
            <strong>{quote ? money(quote.totalPriceCents) : "—"}</strong>
          </div>
          {!added
            ? <button className="button primary" type="button" onClick={addToCart} disabled={!quote || busy || Boolean(error) || product.soldOut}>
              Adicionar ao carrinho
            </button>
            : <>
              <Link className="button primary" to="/carrinho">Ir para o carrinho</Link>
              <button className="button ghost" type="button" onClick={onClose}>Continuar comprando</button>
            </>}
        </div>
      </div>
    </section>
    {fullscreen && <div className="fullscreen-media" role="dialog" aria-modal="true" onClick={() => setFullscreen(false)}>
      <button type="button" onClick={() => setFullscreen(false)} aria-label="Fechar imagem">×</button>
      <img src={product.cover?.url ?? brandPlaceholder} alt={product.cover?.altText ?? product.displayName} />
    </div>}
  </div>;
}

type CatalogCombo = CatalogPayload["combos"][number];

function ComboConfigurator({ combo, onClose }: { combo: CatalogCombo; onClose: () => void }) {
  const cart = useCart();
  const [builder, setBuilder] = useState<ComboBuilderPayload | null>(null);
  const [selectionIds, setSelectionIds] = useState<string[]>([]);
  const [slotAddons, setSlotAddons] = useState<Record<number, Record<string, number>>>({});
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof configureLilyCombo>> | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const quoteRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    setError("");
    getLilyComboBuilder(combo.id)
      .then((payload) => {
        if (cancelled) return;
        setBuilder(payload);
        const first = payload.options[0]?.id ?? "";
        setSelectionIds(Array.from({ length: payload.quantity }, () => first));
        if (!payload.options.length) setError("Nenhum produto disponível atende às regras deste combo.");
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o combo.");
      })
      .finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [combo.id]);

  function setSlot(index: number, productId: string) {
    setAdded(false);
    setSelectionIds((current) => current.map((value, currentIndex) => currentIndex === index ? productId : value));
    setSlotAddons((current) => ({ ...current, [index]: {} }));
  }

  function setSlotAddon(index: number, addonId: string, quantity: number, max: number) {
    setAdded(false);
    setSlotAddons((current) => {
      const nextForSlot = { ...(current[index] ?? {}) };
      if (quantity <= 0) delete nextForSlot[addonId];
      else nextForSlot[addonId] = Math.min(quantity, max);
      return { ...current, [index]: nextForSlot };
    });
  }

  const selectionsSignature = useMemo(
    () => JSON.stringify({ selectionIds, slotAddons }),
    [selectionIds, slotAddons]
  );

  useEffect(() => {
    setQuote(null);
    setError((current) => loadingOptions ? current : "");
    if (!builder || loadingOptions || selectionIds.length !== builder.quantity || selectionIds.some((id) => !id)) return;

    const selections = selectionIds.map((id, index) => {
      const product = builder.options.find((option) => option.id === id);
      if (!product) return null;
      const addons = Object.entries(slotAddons[index] ?? {}).map(([addonId, quantity]) => ({ addonId, quantity }));
      return {
        productId: product.id,
        sizeMl: builder.sizeMl,
        flavorIds: product.flavors.map((flavor) => flavor.id),
        addons
      };
    });

    if (selections.some((selection) => !selection)) return;
    const requestId = ++quoteRequest.current;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      configureLilyCombo({
        comboId: combo.id,
        selections: selections as NonNullable<(typeof selections)[number]>[]
      }).then((result) => {
        if (quoteRequest.current !== requestId) return;
        setQuote(result);
        setError("");
      }).catch((cause) => {
        if (quoteRequest.current !== requestId) return;
        setQuote(null);
        setError(cause instanceof Error ? cause.message : "Não foi possível validar este combo.");
      }).finally(() => {
        if (quoteRequest.current === requestId) setQuoting(false);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [builder, loadingOptions, selectionsSignature, combo.id]);

  function addCombo() {
    if (!quote) return;
    cart.addItem({
      kind: "combo",
      productId: quote.combo.id,
      productName: quote.combo.name,
      variantId: "combo",
      variantName: "Combo",
      sizeMl: 0,
      flavorIds: [],
      flavors: [],
      addons: [],
      comboId: quote.combo.id,
      comboSelections: quote.selections.map((selection) => ({
        productId: selection.product.id,
        productName: selection.product.name,
        sizeMl: selection.sizeMl,
        flavorIds: selection.flavors.map((flavor) => flavor.id),
        flavors: selection.flavors,
        addons: selection.addons,
        configurationHash: selection.configurationHash
      })),
      configurationHash: quote.configurationHash,
      unitPriceCents: quote.totalPriceCents
    });
    setAdded(true);
  }

  return <div className="product-modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="product-modal combo-modal" role="dialog" aria-modal="true" aria-label={combo.name}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
      <div className="combo-cover">
        <span className="offer-pill">{money(combo.savingsCents)} OFF</span>
        <span className="eyebrow">Combo CookLily</span>
        <h2>{combo.name}</h2>
        {combo.description && <p>{combo.description}</p>}
        <strong>{money(combo.offerPriceCents)}</strong>
        <small><s>{money(combo.regularPriceCents)}</s></small>
      </div>

      <div className="product-modal-panel">
        <div className="product-modal-content combo-modal-content">
          {loadingOptions && <p>Carregando opções do combo...</p>}
          {builder && Array.from({ length: builder.quantity }, (_, index) => {
            const selectedProduct = builder.options.find((product) => product.id === selectionIds[index]);
            const addons = slotAddons[index] ?? {};
            const addonUnits = Object.values(addons).reduce((sum, value) => sum + value, 0);
            return <fieldset className="combo-slot" key={index}>
              <legend>Item {index + 1} · {builder.sizeMl} ml</legend>
              <select value={selectionIds[index] ?? ""} disabled={loadingOptions || builder.options.length === 0}
                onChange={(event) => setSlot(index, event.target.value)}>
                <option value="">Escolha um produto</option>
                {builder.options.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
              </select>

              {selectedProduct && <div className="combo-slot-preview">
                {selectedProduct.cover && <img src={selectedProduct.cover.url} alt="" />}
                <div>
                  <strong>{selectedProduct.displayName}</strong>
                  {selectedProduct.flavors.length > 0 && <small>{selectedProduct.flavors.map((flavor) => flavor.name).join(" + ")}</small>}
                </div>
              </div>}

              {selectedProduct && selectedProduct.addons.length > 0 && <div className="combo-addon-list">
                <small>Adicionais deste item · {addonUnits}/4 porções</small>
                {selectedProduct.addons.map((addon) => {
                  const quantity = addons[addon.id] ?? 0;
                  return <div className="addon-row compact" key={addon.id}>
                    <div><strong>{addon.name}</strong><small>+ {money(addon.priceCents)}</small></div>
                    <div className="stepper">
                      <button type="button" onClick={() => setSlotAddon(index, addon.id, quantity - 1, addon.individualLimit)} disabled={quantity === 0}>−</button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => setSlotAddon(index, addon.id, quantity + 1, addon.individualLimit)}
                        disabled={quantity >= addon.individualLimit || addonUnits >= 4}>+</button>
                    </div>
                  </div>;
                })}
              </div>}
            </fieldset>;
          })}

          <small>Categoria, tamanho, disponibilidade, adicionais e preço são validados automaticamente no servidor.</small>
          {error && <p className="error" role="alert">{error}</p>}
          {quoting && <p className="config-status" role="status">Validando combo e recalculando...</p>}
        </div>

        <div className="product-modal-footer">
          <div className="modal-price">
            <small>{error ? "Combo inválido" : quoting ? "Calculando..." : quote ? "Total" : "Monte o combo"}</small>
            <strong>{quote ? money(quote.totalPriceCents) : money(combo.offerPriceCents)}</strong>
          </div>
          {!added
            ? <button className="button primary" type="button" disabled={!quote || quoting || Boolean(error)} onClick={addCombo}>Adicionar combo ao carrinho</button>
            : <>
              <Link className="button primary" to="/carrinho">Ir para o carrinho</Link>
              <button className="button ghost" type="button" onClick={onClose}>Continuar comprando</button>
            </>}
        </div>
      </div>
    </section>
  </div>;
}

function ProductCard({ product, onOpen }: { product: CatalogProduct; onOpen: () => void }) {
  const price = minimumPrice(product);
  const bestOffer = product.offers[0];
  return <article className={`product-card ${product.soldOut ? "sold-out" : ""}`}>
    <div className="product-card-media">
      <ProductImage product={product} onOpen={onOpen} />
      {bestOffer && <span className="offer-badge">{money(bestOffer.savingsCents)} OFF</span>}
      {product.weeklyHighlight && <span className="weekly-badge">Destaque</span>}
      {product.soldOut && <span className="soldout-badge">Esgotado</span>}
    </div>
    <button className="product-card-body" type="button" onClick={onOpen}>
      <span className="product-category">{product.category.parent?.name ?? product.category.name}</span>
      <h3>{product.displayName}</h3>
      {product.descriptiveName && <span className="product-descriptor">{product.descriptiveName}</span>}
      {product.description && <p>{product.description}</p>}
      <div className="product-price">
        {bestOffer
          ? <><small>Oferta</small><s>{money(bestOffer.regularPriceCents)}</s><strong>{money(bestOffer.offerPriceCents)}</strong></>
          : price > 0 ? <><small>A partir de</small><strong>{money(price)}</strong></> : <strong>Em breve</strong>}
      </div>
    </button>
  </article>;
}

export function FeaturedCarousel() {
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    getLilyCatalog({ limit: 40 }).then(setPayload).catch(() => setPayload(null));
  }, []);

  const items = useMemo(() => {
    if (!payload) return [];
    return payload.products.filter((product) => product.featured || product.weeklyHighlight).slice(0, 8);
  }, [payload]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 4500);
    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  if (!items.length) return null;
  const product = items[index % items.length]!;

  return <section className="featured-section" aria-labelledby="featured-title">
    <div className="section-heading">
      <div><span className="eyebrow">Destaques e ofertas</span><h2 id="featured-title">Tem coisa boa passando por aqui.</h2></div>
      <div className="carousel-controls">
        <button type="button" onClick={() => { setPaused(true); setIndex((value) => (value - 1 + items.length) % items.length); }} aria-label="Anterior">←</button>
        <button type="button" onClick={() => { setPaused(true); setIndex((value) => (value + 1) % items.length); }} aria-label="Próximo">→</button>
      </div>
    </div>
    <div className="featured-slide" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <img src={product.cover?.url ?? brandPlaceholder} alt={product.cover?.altText ?? product.displayName} />
      <div>
        {product.weeklyHighlight && <span className="offer-pill">Produto da semana</span>}
        <h3>{product.displayName}</h3>
        <p>{product.description}</p>
        <strong>{product.offers[0] ? money(product.offers[0].offerPriceCents) : money(minimumPrice(product))}</strong>
        <a className="button primary" href={`${import.meta.env.BASE_URL}cardapio#${product.slug}`}>Ver no cardápio</a>
      </div>
    </div>
  </section>;
}

type Filters = {
  q: string;
  category: string;
  subcategory: string;
  flavor: string;
  size: string;
  availability: string;
  offer: boolean;
};

const initialFilters: Filters = {
  q: "",
  category: "",
  subcategory: "",
  flavor: "",
  size: "",
  availability: "all",
  offer: false
};

export function CatalogPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [meta, setMeta] = useState<CatalogPayload | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<CatalogCombo | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const query = useMemo(() => ({
    q: filters.q || undefined,
    category: filters.category || undefined,
    subcategory: filters.subcategory || undefined,
    flavor: filters.flavor || undefined,
    size: filters.size || undefined,
    availability: filters.availability,
    offer: filters.offer ? "true" : undefined,
    limit: 12
  }), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      getLilyCatalog({ ...query, offset: 0 })
        .then((payload) => {
          if (cancelled) return;
          setMeta(payload);
          setProducts(payload.products);
          setNextOffset(payload.nextOffset);
        })
        .catch((cause) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : "Falha ao carregar o cardápio.");
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, filters.q ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  async function loadMore() {
    if (loading || nextOffset == null) return;
    setLoading(true);
    try {
      const payload = await getLilyCatalog({ ...query, offset: nextOffset });
      setProducts((current) => {
        const known = new Set(current.map((product) => product.id));
        return [...current, ...payload.products.filter((product) => !known.has(product.id))];
      });
      setNextOffset(payload.nextOffset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar mais produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const node = sentinel.current;
    if (!node || nextOffset == null) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "500px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextOffset, loading, query]);

  const selectedCategory = meta?.categories.find((category) => category.slug === filters.category);
  const activeFilterCount = [
    filters.category,
    filters.subcategory,
    filters.flavor,
    filters.size,
    filters.availability !== "all" ? filters.availability : "",
    filters.offer ? "offer" : ""
  ].filter(Boolean).length;

  return <>
    <section className="catalog-hero">
      <span className="eyebrow">Cardápio CookLily</span>
      <h1>Escolha pelo sabor. A gente cuida da cremosidade.</h1>
      <p>Explore Batidas de Açaí e LilyShakes, combine sabores e veja os adicionais disponíveis para cada produto.</p>
    </section>

    <section className="catalog-toolbar" aria-label="Pesquisa e filtros">
      <label className="search-field">
        <span className="sr-only">Pesquisar</span>
        <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Buscar sabor ou produto..." />
      </label>
      <button className={`button filter-toggle ${filtersOpen ? "active" : ""}`} type="button"
        aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}>
        Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </button>

      {filtersOpen && <div className="catalog-filter-panel">
        <select aria-label="Categoria" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value, subcategory: "" }))}>
          <option value="">Todas as categorias</option>
          {meta?.categories.map((category) => <option key={category.id} value={category.slug}>{category.name}{category.isComingSoon ? " · em breve" : ""}</option>)}
        </select>
        <select aria-label="Subcategoria" value={filters.subcategory} onChange={(event) => setFilters((current) => ({ ...current, subcategory: event.target.value }))}>
          <option value="">Todas as subcategorias</option>
          {(selectedCategory?.children ?? meta?.categories.flatMap((category) => category.children) ?? []).map((category) =>
            <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
        <select aria-label="Sabor" value={filters.flavor} onChange={(event) => setFilters((current) => ({ ...current, flavor: event.target.value }))}>
          <option value="">Todos os sabores</option>
          {meta?.flavors.map((flavor) => <option key={flavor.id} value={flavor.slug}>{flavor.name}</option>)}
        </select>
        <select aria-label="Tamanho" value={filters.size} onChange={(event) => setFilters((current) => ({ ...current, size: event.target.value }))}>
          <option value="">Todos os tamanhos</option>
          <option value="300">300 ml</option>
          <option value="500">500 ml</option>
        </select>
        <select aria-label="Disponibilidade" value={filters.availability} onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}>
          <option value="all">Disponíveis e esgotados</option>
          <option value="available">Disponíveis</option>
          <option value="soldout">Esgotados</option>
        </select>
        <label className="filter-check"><input type="checkbox" checked={filters.offer} onChange={(event) => setFilters((current) => ({ ...current, offer: event.target.checked }))} /> Ofertas</label>
        <button className="button ghost" type="button" onClick={() => setFilters(initialFilters)}>Limpar filtros</button>
      </div>}
    </section>

    {meta?.combos.length ? <section className="combo-strip" aria-label="Combos">
      {meta.combos.map((combo) => <article key={combo.id}>
        <span className="offer-pill">{money(combo.savingsCents)} OFF</span>
        <strong>{combo.name}</strong>
        <small>{combo.description}</small>
        <span><s>{money(combo.regularPriceCents)}</s> {money(combo.offerPriceCents)}</span>
        <button className="button ghost" type="button" onClick={() => setSelectedCombo(combo)}>Montar combo</button>
      </article>)}
    </section> : null}

    {error && <p className="error" role="alert">{error}</p>}
    <div className="catalog-summary"><strong>{meta?.total ?? 0}</strong> opções encontradas</div>
    <section className="catalog-grid" aria-live="polite">
      {products.map((product) => <ProductCard key={product.id} product={product} onOpen={() => setSelected(product)} />)}
    </section>
    {!loading && products.length === 0 && <section className="empty-state"><h2>Nenhum produto com esses filtros.</h2><p>Tente limpar um filtro ou pesquisar outro sabor.</p></section>}
    <div className="catalog-sentinel" ref={sentinel}>
      {loading && <span>Carregando...</span>}
      {!loading && nextOffset != null && <button className="button ghost" type="button" onClick={loadMore}>Carregar mais</button>}
    </div>
    {selected && <ProductConfigurator product={selected} onClose={() => setSelected(null)} />}
    {selectedCombo && <ComboConfigurator combo={selectedCombo} onClose={() => setSelectedCombo(null)} />}
  </>;
}
