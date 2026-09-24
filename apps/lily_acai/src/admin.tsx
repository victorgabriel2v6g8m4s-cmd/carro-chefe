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
    <a className="button primary" href={`${import.meta.env.BASE_URL}entrar`}>Entrar</a>
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
      <label className="toggle"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Destaque</label>
      <label className="toggle"><input type="checkbox" checked={draft.weeklyHighlight} onChange={(e) => setDraft({ ...draft, weeklyHighlight: e.target.checked })} /> Produto da semana</label>
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
