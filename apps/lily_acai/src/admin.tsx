import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getLilyAdminCatalog, getLilyAdminCatalogIndex, getLilySession, uploadLilyMedia, type AuthPayload } from "./api";
import { LilyLoadingSpinner } from "./loading-spinner";
import { CreateProduct } from "./features/admin/catalog/ProductCreationForm";
import { CategoryEditor } from "./features/admin/catalog/CategoryEditor";
import { CatalogGlobalSettings } from "./features/admin/catalog/CatalogGlobalSettings";
import { ProductCatalogIndex } from "./features/admin/catalog/ProductCatalogIndex";


function useAdminData(loadCatalog: boolean | "index") {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    try {
      const current = await getLilySession();
      if (!["staff", "admin"].includes(current.user.role)) throw new Error("Sua conta não possui perfil staff CookLily.");
      setSession(current);
      if (loadCatalog) setData(loadCatalog === "index" ? await getLilyAdminCatalogIndex() : await getLilyAdminCatalog());
    } catch (cause) {
      if (!data) {
        setSession(null);
        setData(null);
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  return { session, data, error, loading, refresh, setError };
}

export function AdminGate({ children, loadCatalog = false }: {
  children: (state: ReturnType<typeof useAdminData>) => ReactNode;
  loadCatalog?: boolean | "index";
}) {
  const state = useAdminData(loadCatalog);
  if (state.loading) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando painel"/></section>;
  if (!state.session || (loadCatalog && !state.data)) return <section className="admin-state">
    <span className="eyebrow">Painel CookLily</span>
    <h1>Acesso staff necessário.</h1>
    <p>{state.error || "Entre com uma conta da equipe para administrar o catálogo."}</p>
    <a className="button primary" href={`${import.meta.env.BASE_URL}entrar?next=${encodeURIComponent(window.location.pathname.replace(/^\/lilyacai/, "") || "/painel")}`}>Entrar</a>
  </section>;
  return <>{children(state)}</>;
}

export function AdminHome() {
  return <AdminGate loadCatalog>{({ data, session }) => <section className="admin-page">
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
  </section>}</AdminGate>;
}

export function AdminCatalog() {
  return <AdminGate loadCatalog="index">{({ data, session, error, refresh, setError }) => <section className="admin-page wide">
    <div className="admin-heading">
      <div><span className="eyebrow">Entrega 05</span><h1>Cardápio administrável</h1><p>Alterações publicadas refletem no cardápio sem rebuild.</p></div>
      <div className="admin-actions"><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Resumo</a><a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Preview</a></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <CreateProduct data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CategoryEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CatalogGlobalSettings csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <ProductCatalogIndex products={data!.products} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
  </section>}</AdminGate>;
}

export function AdminMedia() {
  return <AdminGate loadCatalog>{({ data, session, error, refresh, setError }) => {
    async function upload(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
    const formElement = event.currentTarget;
    const input = formElement.elements.namedItem("file") as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadLilyMedia(file, session!.csrfToken);
        formElement.reset();
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha no upload.");
      }
    }
    return <section className="admin-page">
      <div className="admin-heading"><div><span className="eyebrow">Mídia CookLily</span><h1>Fotos e vídeos do catálogo</h1><p>JPEG, PNG, WebP, MP4 ou WebM. Até 50 MB por arquivo.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Voltar ao cardápio</a></div>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="media-upload" onSubmit={upload}><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required /><button className="button primary" type="submit">Enviar mídia</button></form>
      <div className="media-grid">
        {data!.media.map((media: any) => <article key={media.id}>
          {String(media.mime).startsWith("video/") ? <video src={`/api/v1/lily/public/media/${media.id}`} muted controls preload="metadata" aria-label={media.altText} /> : <img src={`/api/v1/lily/public/media/${media.id}`} alt={media.altText} />}
          <strong>{media.originalName}</strong><small>{Math.round(media.size / 1024)} KB · {media.mime}</small>
        </article>)}
      </div>
    </section>;
  }}</AdminGate>;
}
