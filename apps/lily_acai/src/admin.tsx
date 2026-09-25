import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getLilyAdminCatalog, getLilySession, lilyAdminJson, uploadLilyMedia, type AuthPayload } from "./api";

function moneyInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function parseMoney(input: string) {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function useAdminData() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const current = await getLilySession();
      if (!["staff", "admin"].includes(current.user.role)) throw new Error("Sua conta não possui perfil staff CookLily.");
      setSession(current);
      setData(await getLilyAdminCatalog());
    } catch (cause) {
      setSession(null);
      setData(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  return { session, data, error, loading, refresh, setError };
}

function AdminGate({ children }: { children: (state: ReturnType<typeof useAdminData>) => ReactNode }) {
  const state = useAdminData();
  if (state.loading) return <section className="admin-state"><h1>Carregando painel...</h1></section>;
  if (!state.session || !state.data) return <section className="admin-state">
    <span className="eyebrow">Painel CookLily</span>
    <h1>Acesso staff necessário.</h1>
    <p>{state.error || "Entre com uma conta da equipe para administrar o catálogo."}</p>
    <a className="button primary" href={`${import.meta.env.BASE_URL}entrar?next=${encodeURIComponent(window.location.pathname.replace(/^\/lilyacai/, "") || "/painel")}`}>Entrar</a>
  </section>;
  return <>{children(state)}</>;
}

export function AdminHome() {
  return <AdminGate>{({ data, session }) => <section className="admin-page">
    <div className="admin-heading">
      <div><span className="eyebrow">CookLily · operação</span><h1>Painel do catálogo</h1><p>Olá, {session!.user.displayName ?? session!.user.phone}.</p></div>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Abrir cardápio</a>
    </div>
    <div className="admin-kpis">
      <article><strong>{data!.products.length}</strong><span>produtos</span></article>
      <article><strong>{data!.categories.length}</strong><span>categorias</span></article>
      <article><strong>{data!.flavors.length}</strong><span>sabores</span></article>
      <article><strong>{data!.addons.length}</strong><span>adicionais</span></article>
      <article><strong>{data!.media.length}</strong><span>mídias</span></article>
    </div>
    <div className="admin-actions">
      <a className="button primary" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Administrar cardápio</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/midias`}>Mídias</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/entrega`}>Operação e configurações</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/pagamentos`}>Pagamentos</a>
    </div>
  </section>}</AdminGate>;
}

function ProductEditor({ product, data, csrf, refresh, setError }: {
  product: any;
  data: Record<string, any>;
  csrf: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [draft, setDraft] = useState({
    displayName: product.displayName,
    descriptiveName: product.descriptiveName ?? "",
    description: product.description ?? "",
    categoryId: product.category.id,
    status: product.rawStatus ?? product.status,
    isAvailable: product.isAvailable,
    featured: product.featured,
    weeklyHighlight: product.weeklyHighlight,
    sortOrder: product.sortOrder,
    coverMediaId: product.cover?.id ?? ""
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      featured: product.featured,
      weeklyHighlight: product.weeklyHighlight
    }));
  }, [product.featured, product.weeklyHighlight]);

  const [flavorIds, setFlavorIds] = useState<string[]>(product.rawFlavorIds ?? []);
  const [addonIds, setAddonIds] = useState<string[]>((product.rawAddonLinks ?? []).filter((item: any) => item.allowed).map((item: any) => item.addonId));
  const [mixTiers, setMixTiers] = useState<Array<{ flavorCount: number; sizeMl: number; priceCents: number; status: string }>>(
    (product.mixTiers ?? []).map((tier: any) => ({ flavorCount: tier.flavorCount, sizeMl: tier.sizeMl, priceCents: tier.priceCents, status: "published" }))
  );

  async function save() {
    setBusy(true);
    setError("");
    try {
      await lilyAdminJson(`products/${product.id}`, "PATCH", csrf, {
        ...draft,
        coverMediaId: draft.coverMediaId || null
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar produto.");
    } finally {
      setBusy(false);
    }
  }

  async function saveVariant(variant: any, field: HTMLInputElement, available: HTMLInputElement, status: HTMLSelectElement) {
    setError("");
    try {
      await lilyAdminJson(`variants/${variant.id}`, "PATCH", csrf, {
        priceCents: parseMoney(field.value),
        isAvailable: available.checked,
        status: status.value
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar preço.");
    }
  }

  async function saveRelations() {
    setBusy(true);
    setError("");
    try {
      await lilyAdminJson(`products/${product.id}/flavors`, "PUT", csrf, { flavorIds });
      const nutellaFlavor = data.flavors.find((flavor: any) => flavor.slug === "nutella");
      const productHasNutella = Boolean(nutellaFlavor && flavorIds.includes(nutellaFlavor.id));
      await lilyAdminJson(`products/${product.id}/addons`, "PUT", csrf, {
        addons: addonIds.map((addonId) => {
          const addon = data.addons.find((item: any) => item.id === addonId);
          const existing = (product.rawAddonLinks ?? []).find((item: any) => item.addonId === addonId);
          return {
            addonId,
            allowed: true,
            individualLimit: existing?.individualLimit ?? (productHasNutella && addon?.slug === "nutella" ? 1 : addon?.individualLimit ?? 2)
          };
        })
      });
      if (product.configurationType === "lilymix") {
        await lilyAdminJson(`products/${product.id}/mix-tiers`, "PUT", csrf, { tiers: mixTiers });
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar regras do produto.");
    } finally {
      setBusy(false);
    }
  }

  return <details className="admin-product" id={product.slug}>
    <summary>
      <span><strong>{product.displayName}</strong><small>{product.descriptiveName}</small></span>
      <span className={product.isPurchasable ? "state-live" : "state-off"}>{product.isPurchasable ? "Disponível" : "Esgotado/pausado"}</span>
    </summary>
    <div className="admin-product-grid">
      <label>Nome<input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} /></label>
      <label>Nome descritivo<input value={draft.descriptiveName} onChange={(e) => setDraft({ ...draft, descriptiveName: e.target.value })} /></label>
      <label>Categoria<select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
        {data.categories.map((category: any) => <option value={category.id} key={category.id}>{category.name}</option>)}
      </select></label>
      <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
        <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option>
      </select></label>
      <label>Ordem<input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></label>
      <label>Capa<select value={draft.coverMediaId} onChange={(e) => setDraft({ ...draft, coverMediaId: e.target.value })}>
        <option value="">Placeholder</option>
        {data.media.filter((media: any) => media.status === "active").map((media: any) =>
          <option value={media.id} key={media.id}>{media.originalName}</option>)}
      </select></label>
      <label className="admin-span">Descrição<textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <label className="toggle"><input type="checkbox" checked={draft.isAvailable} onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })} /> Disponível</label>
      <label className="toggle"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Mais pedido · etiqueta na grade</label>
      <label className="toggle"><input type="checkbox" checked={draft.weeklyHighlight} onChange={(e) => setDraft({ ...draft, weeklyHighlight: e.target.checked })} /> Escolha da semana · banner exclusivo</label>
      <button className="button primary" type="button" disabled={busy} onClick={save}>{busy ? "Salvando..." : "Salvar produto"}</button>
    </div>
    <div className="variant-admin">
      <h4>Variações e preços</h4>
      {product.rawVariants.map((variant: any) => <form key={variant.id} className="variant-row" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        void saveVariant(
          variant,
          form.elements.namedItem("price") as HTMLInputElement,
          form.elements.namedItem("available") as HTMLInputElement,
          form.elements.namedItem("status") as HTMLSelectElement
        );
      }}>
        <strong>{variant.sizeMl} ml</strong>
        <label>Preço<input name="price" defaultValue={moneyInput(variant.priceCents)} inputMode="decimal" /></label>
        <label>Status<select name="status" defaultValue={variant.status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select></label>
        <label className="toggle"><input name="available" type="checkbox" defaultChecked={variant.isAvailable} /> Disponível</label>
        <button className="button ghost" type="submit">Salvar preço</button>
      </form>)}
    </div>

    <div className="product-rules-admin">
      <div>
        <h4>Sabores deste produto</h4>
        <div className="admin-check-grid">
          {data.flavors.map((flavor: any) => <label key={flavor.id} className="toggle">
            <input type="checkbox" checked={flavorIds.includes(flavor.id)} onChange={(event) =>
              setFlavorIds((current) => event.target.checked ? [...new Set([...current, flavor.id])] : current.filter((id) => id !== flavor.id))
            } />
            {flavor.name}
          </label>)}
        </div>
      </div>
      <div>
        <h4>Adicionais aceitos</h4>
        <div className="admin-check-grid">
          {data.addons.map((addon: any) => <label key={addon.id} className="toggle">
            <input type="checkbox" checked={addonIds.includes(addon.id)} onChange={(event) =>
              setAddonIds((current) => event.target.checked ? [...new Set([...current, addon.id])] : current.filter((id) => id !== addon.id))
            } />
            {addon.name}
          </label>)}
        </div>
      </div>
      {product.configurationType === "lilymix" && <div className="admin-span">
        <h4>Preços LilyMix por número de sabores</h4>
        <div className="tier-grid">
          {mixTiers.map((tier, index) => <label key={`${tier.sizeMl}-${tier.flavorCount}`}>
            {tier.sizeMl} ml · {tier.flavorCount} sabor{tier.flavorCount > 1 ? "es" : ""}
            <input value={moneyInput(tier.priceCents)} onChange={(event) => {
              const next = [...mixTiers];
              next[index] = { ...tier, priceCents: parseMoney(event.target.value) };
              setMixTiers(next);
            }} />
          </label>)}
        </div>
      </div>}
      <button className="button primary" type="button" disabled={busy} onClick={saveRelations}>Salvar sabores, adicionais e regras</button>
    </div>
  </details>;
}

function CreateProduct({ data, csrf, refresh, setError }: any) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const product = await lilyAdminJson<any>("products", "POST", csrf, {
        categoryId: String(form.get("categoryId")),
        slug: String(form.get("slug")),
        displayName: String(form.get("displayName")),
        descriptiveName: String(form.get("descriptiveName") || "") || null,
        description: String(form.get("description") || "") || null,
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        configurationType: form.get("configurationType") === "lilymix" ? "lilymix" : "fixed",
        status: "draft",
        isAvailable: false,
        featured: false,
        weeklyHighlight: false,
        allowPlaceholder: true,
        sortOrder: 500
      });
      await lilyAdminJson("variants", "POST", csrf, {
        productId: product.id,
        sizeMl: 300,
        name: "300 ml",
        priceCents: parseMoney(String(form.get("price300") || "0")),
        status: "draft",
        isAvailable: false,
        sortOrder: 10
      });
      await lilyAdminJson("variants", "POST", csrf, {
        productId: product.id,
        sizeMl: 500,
        name: "500 ml",
        priceCents: parseMoney(String(form.get("price500") || "0")),
        status: "draft",
        isAvailable: false,
        sortOrder: 20
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar produto.");
    }
  }
  return <details className="admin-create">
    <summary>+ Novo produto</summary>
    <form className="admin-form-grid" onSubmit={submit}>
      <label>Nome<input name="displayName" required /></label>
      <label>Slug<input name="slug" placeholder="novo-produto" required /></label>
      <label>Nome descritivo<input name="descriptiveName" /></label>
      <label>Categoria<select name="categoryId">{data.categories.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Tipo<select name="configurationType"><option value="fixed">Produto fixo</option><option value="lilymix">LilyMix</option></select></label>
      <label>Tags<input name="tags" placeholder="morango, novidade" /></label>
      <label>Preço 300 ml<input name="price300" inputMode="decimal" defaultValue="15,00" /></label>
      <label>Preço 500 ml<input name="price500" inputMode="decimal" defaultValue="22,00" /></label>
      <label className="admin-span">Descrição<textarea name="description" rows={3} /></label>
      <button className="button primary" type="submit">Criar como rascunho</button>
    </form>
  </details>;
}

function CategoryEditor({ data, csrf, refresh, setError }: any) {
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await lilyAdminJson("categories", "POST", csrf, {
        parentId: String(form.get("parentId") || "") || null,
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        status: "draft",
        sortOrder: 500,
        isComingSoon: false
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar categoria."); }
  }

  return <details className="admin-create">
    <summary>Categorias</summary>
    <div className="simple-admin-list">
      {data.categories.map((category: any) => <form key={category.id} onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await lilyAdminJson(`categories/${category.id}`, "PATCH", csrf, {
            name: String(form.get("name")),
            status: String(form.get("status")),
            sortOrder: Number(form.get("sortOrder")),
            isComingSoon: form.get("coming") === "on"
          });
          await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao editar categoria."); }
      }}>
        <input name="name" defaultValue={category.name} />
        <select name="status" defaultValue={category.status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select>
        <input name="sortOrder" type="number" defaultValue={category.sortOrder} />
        <label className="toggle"><input name="coming" type="checkbox" defaultChecked={category.isComingSoon} /> Em breve</label>
        <button className="button ghost" type="submit">Salvar</button>
      </form>)}
    </div>
    <form className="admin-form-grid compact" onSubmit={create}>
      <label>Nova categoria<input name="name" required /></label>
      <label>Slug<input name="slug" required /></label>
      <label>Categoria pai<select name="parentId"><option value="">Nenhuma</option>{data.categories.filter((category: any) => !category.parentId).map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button className="button primary" type="submit">Criar rascunho</button>
    </form>
  </details>;
}

function FlavorAddonEditor({ data, csrf, refresh, setError }: any) {
  async function createFlavor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await lilyAdminJson("flavors", "POST", csrf, {
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        status: "published",
        premium: false,
        tags: [],
        portion300: Number(form.get("portion300")),
        portion500: Number(form.get("portion500")),
        priceModifier300: parseMoney(String(form.get("modifier300") || "0")),
        priceModifier500: parseMoney(String(form.get("modifier500") || "0"))
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar sabor."); }
  }

  async function createAddon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await lilyAdminJson("addons", "POST", csrf, {
        flavorId: String(form.get("flavorId") || "") || null,
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        priceCents: parseMoney(String(form.get("price"))),
        portion300: Number(form.get("portion300")),
        portion500: Number(form.get("portion500")),
        individualLimit: 2,
        status: "published"
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar adicional."); }
  }

  const compatibility = useMemo(() => new Set(
    data.compatibilities.filter((item: any) => item.isCompatible).map((item: any) => `${item.flavorAId}:${item.flavorBId}`)
  ), [data.compatibilities]);

  return <div className="admin-split">
    <details className="admin-create">
      <summary>Sabores e compatibilidade</summary>
      <form className="admin-form-grid compact" onSubmit={createFlavor}>
        <label>Nome<input name="name" required /></label><label>Slug<input name="slug" required /></label>
        <label>Porção 300g/ml<input name="portion300" type="number" required /></label><label>Porção 500g/ml<input name="portion500" type="number" required /></label>
        <label>Adicional preço 300<input name="modifier300" defaultValue="0" /></label><label>Adicional preço 500<input name="modifier500" defaultValue="0" /></label>
        <button className="button primary" type="submit">Criar sabor</button>
      </form>
      <div className="compatibility-matrix">
        {data.flavors.map((a: any) => <div className="compat-row" key={a.id}>
          <strong>{a.name}</strong>
          <div>{data.flavors.filter((b: any) => b.id !== a.id).map((b: any) => {
            const checked = compatibility.has(`${a.id}:${b.id}`);
            return <label key={b.id}><input type="checkbox" checked={checked} onChange={async (event) => {
              try {
                await lilyAdminJson("compatibilities", "PUT", csrf, { flavorAId: a.id, flavorBId: b.id, isCompatible: event.target.checked });
                await refresh();
              } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao mudar compatibilidade."); }
            }} /> {b.name}</label>;
          })}</div>
        </div>)}
      </div>
    </details>
    <details className="admin-create">
      <summary>Adicionais</summary>
      <div className="simple-admin-list">
        {data.addons.map((addon: any) => <form key={addon.id} onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await lilyAdminJson(`addons/${addon.id}`, "PATCH", csrf, {
              name: String(form.get("name")),
              priceCents: parseMoney(String(form.get("price"))),
              status: String(form.get("status"))
            });
            await refresh();
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao editar adicional."); }
        }}>
          <input name="name" defaultValue={addon.name} />
          <input name="price" defaultValue={moneyInput(addon.priceCents)} />
          <select name="status" defaultValue={addon.status}><option value="published">Publicado</option><option value="paused">Pausado</option><option value="draft">Rascunho</option></select>
          <button className="button ghost" type="submit">Salvar</button>
        </form>)}
      </div>
      <form className="admin-form-grid compact" onSubmit={createAddon}>
        <label>Nome<input name="name" required /></label><label>Slug<input name="slug" required /></label>
        <label>Sabor relacionado<select name="flavorId"><option value="">Nenhum</option>{data.flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}</select></label>
        <label>Preço<input name="price" required /></label>
        <label>Porção 300<input name="portion300" type="number" required /></label><label>Porção 500<input name="portion500" type="number" required /></label>
        <button className="button primary" type="submit">Criar adicional</button>
      </form>
    </details>
  </div>;
}


function CommercialEditor({ data, csrf, refresh, setError }: any) {
  async function saveCombo(event: FormEvent<HTMLFormElement>, combo: any) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = String(form.get("mode") || "preset");
    const quantity = Math.min(5, Math.max(1, Number(form.get("quantity") || 1)));

    const presetSelections = Array.from({ length: quantity }, (_, index) => {
      const productId = String(form.get(`presetProduct-${index}`) || "");
      const selectedProduct = data.products.find((product: any) => product.id === productId);
      const requestedSize = Number(form.get(`presetSize-${index}`) || 0);
      const fallbackSize = selectedProduct?.rawVariants?.find((variant: any) => variant.isAvailable)?.sizeMl
        ?? selectedProduct?.rawVariants?.[0]?.sizeMl
        ?? Number(combo.rules?.sizeMl || 300);
      const flavorIds = form.getAll(`presetFlavor-${index}`).map(String).filter(Boolean);
      return {
        productId,
        sizeMl: requestedSize || fallbackSize,
        flavorIds,
        addons: []
      };
    }).filter((selection) => selection.productId);

    if (mode === "preset" && presetSelections.length !== quantity) {
      setError("Escolha um produto para cada item do combo pronto.");
      return;
    }

    const builderSizeRaw = Number(form.get("builderSize") || 0);
    const builderFlavorCountRaw = Number(form.get("builderFlavorCount") || 0);
    const rules = {
      ...(combo.rules ?? {}),
      mode,
      quantity,
      coverProductId: String(form.get("coverProductId") || "") || null,
      presetSelections: mode === "preset"
        ? presetSelections
        : (Array.isArray(combo.rules?.presetSelections) ? combo.rules.presetSelections : []),
      category: String(form.get("builderCategory") || "") || null,
      subtype: String(form.get("builderSubtype") || "") || null,
      sizeMl: builderSizeRaw || null,
      flavorCount: builderFlavorCountRaw || null
    };

    try {
      await lilyAdminJson(`combos/${combo.id}`, "PATCH", csrf, {
        name: String(form.get("name")),
        description: String(form.get("description") || "") || null,
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status")),
        featured: form.get("featured") === "on",
        rules
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar combo.");
    }
  }

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId"));
    const variantId = String(form.get("variantId") || "") || null;
    try {
      await lilyAdminJson("offers", "POST", csrf, {
        productId,
        variantId,
        name: String(form.get("name")),
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status") || "draft"),
        campaignId: String(form.get("campaignId") || "") || null,
        minProjectedMarginBps: 1000
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar oferta.");
    }
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>, offer: any) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await lilyAdminJson(`offers/${offer.id}`, "PATCH", csrf, {
        name: String(form.get("name")),
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status")),
        campaignId: String(form.get("campaignId") || "") || null
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar oferta.");
    }
  }

  const selectedProductForOffer = data.products[0];
  const rootCategories = data.categories.filter((category: any) => !category.parentId);

  return <details className="admin-create">
    <summary>Ofertas e combos</summary>
    <div className="commercial-admin">
      <section>
        <h4>Combos</h4>
        <p>O modo <strong>Sabores selecionados</strong> é o padrão comercial. O modo <strong>Cliente monta</strong> permanece disponível e pode ser ativado a qualquer momento.</p>
        <div className="combo-admin-list">
          {data.combos.map((combo: any) => {
            const rules = combo.rules ?? {};
            const configuredPresetSelections = Array.isArray(rules.presetSelections) ? rules.presetSelections : [];
            const presetSelections = configuredPresetSelections.length
              ? configuredPresetSelections
              : (Array.isArray(combo.resolvedPresetSelections) ? combo.resolvedPresetSelections : []);
            const quantity = Math.min(5, Math.max(1, Number(rules.quantity || presetSelections.length || 1)));
            const mode = rules.mode === "builder" ? "builder" : "preset";
            return <form className="combo-admin-card" key={combo.id} onSubmit={(event) => void saveCombo(event, combo)}>
              <div className="combo-admin-main">
                <label>Nome<input name="name" defaultValue={combo.name} /></label>
                <label>Descrição<input name="description" defaultValue={combo.description ?? ""} /></label>
                <label>Preço regular<input name="regular" defaultValue={moneyInput(combo.regularPriceCents)} /></label>
                <label>Preço do combo<input name="offer" defaultValue={moneyInput(combo.offerPriceCents)} /></label>
                <label>Modo
                  <select name="mode" defaultValue={mode}>
                    <option value="preset">Sabores selecionados</option>
                    <option value="builder">Cliente monta</option>
                  </select>
                </label>
                <label>Quantidade de itens<input name="quantity" type="number" min="1" max="5" defaultValue={quantity} /></label>
                <label>Status<select name="status" defaultValue={combo.status}>
                  <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option>
                </select></label>
                <label className="toggle"><input name="featured" type="checkbox" defaultChecked={combo.featured} /> Destaque</label>
                <label className="combo-admin-cover">Produto usado como capa
                  <select name="coverProductId" defaultValue={rules.coverProductId ?? presetSelections[0]?.productId ?? ""}>
                    <option value="">Primeiro produto do combo</option>
                    {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
                  </select>
                </label>
              </div>

              <details className="combo-admin-mode" open={mode === "preset"}>
                <summary>Configuração do combo pronto</summary>
                <p>Somente os primeiros itens definidos em “Quantidade de itens” serão enviados. Em produto fixo, você pode deixar sabores sem seleção para usar os sabores próprios do produto. Em LilyMix, selecione de 1 a 3 sabores.</p>
                <div className="combo-preset-slots">
                  {Array.from({ length: 5 }, (_, index) => {
                    const selection = presetSelections[index] ?? {};
                    return <fieldset key={index}>
                      <legend>Item {index + 1}{index >= quantity ? " · reserva" : ""}</legend>
                      <label>Produto
                        <select name={`presetProduct-${index}`} defaultValue={selection.productId ?? ""}>
                          <option value="">Selecione</option>
                          {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
                        </select>
                      </label>
                      <label>Tamanho (ml)
                        <input name={`presetSize-${index}`} type="number" min="100" max="5000" defaultValue={selection.sizeMl ?? rules.sizeMl ?? 300} />
                      </label>
                      <label>Sabores
                        <select name={`presetFlavor-${index}`} multiple size={4} defaultValue={Array.isArray(selection.flavorIds) ? selection.flavorIds : []}>
                          {data.flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
                        </select>
                      </label>
                    </fieldset>;
                  })}
                </div>
              </details>

              <details className="combo-admin-mode" open={mode === "builder"}>
                <summary>Regras do modo “Cliente monta”</summary>
                <div className="combo-builder-rules">
                  <label>Categoria
                    <select name="builderCategory" defaultValue={rules.category ?? ""}>
                      <option value="">Qualquer categoria</option>
                      {rootCategories.map((category: any) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                    </select>
                  </label>
                  <label>Subtipo
                    <select name="builderSubtype" defaultValue={rules.subtype ?? ""}>
                      <option value="">Qualquer</option>
                      <option value="simple">Somente simples</option>
                    </select>
                  </label>
                  <label>Tamanho (ml)<input name="builderSize" type="number" min="100" max="5000" defaultValue={rules.sizeMl ?? 300} /></label>
                  <label>Quantidade de sabores<input name="builderFlavorCount" type="number" min="1" max="3" defaultValue={rules.flavorCount ?? 1} /></label>
                </div>
              </details>

              <div className="combo-admin-actions">
                <small>Modo atual: <strong>{mode === "preset" ? "sabores selecionados" : "cliente monta"}</strong></small>
                <button className="button primary" type="submit">Salvar combo</button>
              </div>
            </form>;
          })}
        </div>
      </section>

      <section>
        <h4>Ofertas de produto</h4>
        {data.offers.length > 0 && <div className="simple-admin-list commercial-list offers-list">
          {data.offers.map((offer: any) => <form key={offer.id} onSubmit={(event) => void saveOffer(event, offer)}>
            <input name="name" defaultValue={offer.name} aria-label="Nome da oferta" />
            <input name="regular" defaultValue={moneyInput(offer.regularPriceCents)} aria-label="Preço regular" />
            <input name="offer" defaultValue={moneyInput(offer.offerPriceCents)} aria-label="Preço oferta" />
            <input name="campaignId" defaultValue={offer.campaignId ?? ""} placeholder="campanha" />
            <select name="status" defaultValue={offer.status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select>
            <button className="button ghost" type="submit">Salvar</button>
          </form>)}
        </div>}

        <form className="admin-form-grid compact offer-create" onSubmit={createOffer}>
          <label>Nome<input name="name" placeholder="Oferta de lançamento" required /></label>
          <label>Produto<select name="productId" defaultValue={selectedProductForOffer?.id ?? ""} required>
            {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
          </select></label>
          <label>Variante opcional<select name="variantId">
            <option value="">Produto inteiro</option>
            {data.products.flatMap((product: any) => product.rawVariants.map((variant: any) =>
              <option key={variant.id} value={variant.id}>{product.displayName} · {variant.sizeMl} ml</option>
            ))}
          </select></label>
          <label>Preço regular<input name="regular" inputMode="decimal" required /></label>
          <label>Preço oferta<input name="offer" inputMode="decimal" required /></label>
          <label>Campanha<input name="campaignId" placeholder="lancamento" /></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
          <button className="button primary" type="submit">Criar oferta</button>
        </form>
      </section>
    </div>
  </details>;
}

export function AdminCatalog() {
  return <AdminGate>{({ data, session, error, refresh, setError }) => <section className="admin-page wide">
    <div className="admin-heading">
      <div><span className="eyebrow">Entrega 05</span><h1>Cardápio administrável</h1><p>Alterações publicadas refletem no cardápio sem rebuild.</p></div>
      <div className="admin-actions"><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Resumo</a><a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Preview</a></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <CreateProduct data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CategoryEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <FlavorAddonEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CommercialEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <div className="admin-product-list">
      {data!.products.map((product: any) => <ProductEditor key={product.id} product={product} data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />)}
    </div>
  </section>}</AdminGate>;
}

export function AdminMedia() {
  return <AdminGate>{({ data, session, error, refresh, setError }) => {
    async function upload(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadLilyMedia(file, session!.csrfToken);
        event.currentTarget.reset();
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha no upload.");
      }
    }
    return <section className="admin-page">
      <div className="admin-heading"><div><span className="eyebrow">Mídia CookLily</span><h1>Fotos do catálogo</h1><p>JPEG, PNG ou WebP. Até 10 MB.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Voltar ao cardápio</a></div>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="media-upload" onSubmit={upload}><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="button primary" type="submit">Enviar imagem</button></form>
      <div className="media-grid">
        {data!.media.map((media: any) => <article key={media.id}>
          <img src={`/api/v1/lily/public/media/${media.id}`} alt={media.altText} />
          <strong>{media.originalName}</strong><small>{Math.round(media.size / 1024)} KB · {media.mime}</small>
        </article>)}
      </div>
    </section>;
  }}</AdminGate>;
}
