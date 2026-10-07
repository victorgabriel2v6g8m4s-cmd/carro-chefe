export {};

type ToastKind = "success" | "error";

type AdminCatalogProduct = {
  id: string;
  slug: string;
  displayName: string;
  cover: { id: string; url: string; altText?: string } | null;
};

type AdminCatalogPayload = {
  products: AdminCatalogProduct[];
};

type AuthPayload = { csrfToken: string };
type UploadedMedia = { id: string; url: string; originalName: string; altText: string };

const nativeFetch = window.fetch.bind(window);
const TOAST_ROOT_ID = "cooklily-admin-toast-root";
const COVER_MARKER = "data-product-cover-uploader";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 10 * 1024 * 1024;
let catalogPromise: Promise<AdminCatalogPayload> | null = null;
let pendingSnapshot: { node: HTMLElement; rect: DOMRect; openDetails: string[] } | null = null;
let snapshotOverlay: HTMLElement | null = null;

function onCatalogAdminPage() {
  return /\/painel\/cardapio\/?$/.test(window.location.pathname);
}

function ensureStyles() {
  if (document.getElementById("cooklily-admin-enhancement-styles")) return;
  const style = document.createElement("style");
  style.id = "cooklily-admin-enhancement-styles";
  style.textContent = `
    #${TOAST_ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:9999;display:grid;gap:8px;max-width:min(390px,calc(100vw - 36px));pointer-events:none}
    .cooklily-admin-toast{padding:11px 14px;border-radius:12px;box-shadow:0 8px 26px rgba(0,0,0,.22);font-size:.92rem;line-height:1.35;background:#fff;color:#30131d;border:1px solid rgba(48,19,29,.12);animation:cooklily-toast-in .16s ease-out}
    .cooklily-admin-toast[data-kind="success"]{border-left:4px solid #2d8a55}
    .cooklily-admin-toast[data-kind="error"]{border-left:4px solid #b4233d}
    .cooklily-product-cover-uploader{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;align-items:center;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:14px}
    .cooklily-product-cover-uploader img,.cooklily-product-cover-placeholder{width:88px;height:88px;border-radius:12px;object-fit:cover;background:rgba(255,255,255,.06);display:grid;place-items:center;font-size:.78rem;text-align:center}
    .cooklily-product-cover-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .cooklily-product-cover-uploader small{display:block;margin-top:6px;opacity:.72}
    .cooklily-admin-refresh-snapshot{position:fixed;z-index:9000;pointer-events:none;overflow:hidden;background:var(--background,#fff)}
    @keyframes cooklily-toast-in{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
  `;
  document.head.append(style);
}

function toastRoot() {
  ensureStyles();
  let root = document.getElementById(TOAST_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    root.setAttribute("aria-live", "polite");
    document.body.append(root);
  }
  return root;
}

function showToast(message: string, kind: ToastKind) {
  const item = document.createElement("div");
  item.className = "cooklily-admin-toast";
  item.dataset.kind = kind;
  item.setAttribute("role", kind === "error" ? "alert" : "status");
  item.textContent = message;
  toastRoot().append(item);
  window.setTimeout(() => item.remove(), kind === "error" ? 5200 : 2600);
}

async function responseError(response: Response) {
  const body = await response.clone().json().catch(() => null) as { error?: string } | null;
  return body?.error || `HTTP ${response.status}`;
}

function adminMutationMessage(pathname: string, method: string) {
  if (/\/admin\/products\/[^/]+$/.test(pathname) && method === "PATCH") {
    return { success: "Produto atualizado com sucesso.", failure: "Falha ao atualizar produto" };
  }
  if (/\/admin\/variants\/[^/]+$/.test(pathname) && method === "PATCH") {
    return { success: "Preço e variação atualizados com sucesso.", failure: "Falha ao atualizar preço/variação" };
  }
  if (/\/admin\/products\/[^/]+\/(flavors|addons|mix-tiers)$/.test(pathname)) {
    return { success: "Configuração do produto atualizada com sucesso.", failure: "Falha ao atualizar configuração do produto" };
  }
  if (/\/admin\/payment-options\/settings$/.test(pathname)) {
    return { success: "Configuração de pagamentos atualizada com sucesso.", failure: "Falha ao atualizar configuração de pagamentos" };
  }
  if (/\/admin\/categories\//.test(pathname)) {
    return { success: "Categoria atualizada com sucesso.", failure: "Falha ao atualizar categoria" };
  }
  if (/\/admin\/flavors\//.test(pathname)) {
    return { success: "Sabor atualizado com sucesso.", failure: "Falha ao atualizar sabor" };
  }
  if (/\/admin\/addons\//.test(pathname)) {
    return { success: "Adicional atualizado com sucesso.", failure: "Falha ao atualizar adicional" };
  }
  if (/\/admin\/combos\//.test(pathname)) {
    return { success: "Combo atualizado com sucesso.", failure: "Falha ao atualizar combo" };
  }
  if (/\/admin\/offers\//.test(pathname)) {
    return { success: "Oferta atualizada com sucesso.", failure: "Falha ao atualizar oferta" };
  }
  return { success: "Alteração salva com sucesso.", failure: "Falha ao salvar alteração" };
}

function captureAdminSnapshot() {
  const page = document.querySelector<HTMLElement>(".admin-page");
  if (!page) return;
  const clone = page.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll("button,input,select,textarea,a").forEach((element) => element.setAttribute("tabindex", "-1"));
  const openDetails = Array.from(page.querySelectorAll<HTMLDetailsElement>("details[open]")).map((details) => {
    if (details.id) return `#${details.id}`;
    return `summary:${details.querySelector("summary")?.textContent?.trim() ?? ""}`;
  });
  pendingSnapshot = { node: clone, rect: page.getBoundingClientRect(), openDetails };
}

function showSnapshotOverLoading() {
  if (!pendingSnapshot || snapshotOverlay) return;
  const loading = Array.from(document.querySelectorAll<HTMLElement>(".admin-state h1"))
    .find((node) => node.textContent?.includes("Carregando painel"));
  if (!loading) return;

  const overlay = document.createElement("div");
  overlay.className = "cooklily-admin-refresh-snapshot";
  overlay.style.left = `${Math.max(0, pendingSnapshot.rect.left)}px`;
  overlay.style.top = `${pendingSnapshot.rect.top}px`;
  overlay.style.width = `${pendingSnapshot.rect.width}px`;
  overlay.style.height = `${Math.max(window.innerHeight - Math.max(0, pendingSnapshot.rect.top), 240)}px`;
  pendingSnapshot.node.style.margin = "0";
  pendingSnapshot.node.style.width = "100%";
  overlay.append(pendingSnapshot.node);
  document.body.append(overlay);
  snapshotOverlay = overlay;
  loading.closest<HTMLElement>(".admin-state")?.style.setProperty("visibility", "hidden");
}

function restoreOpenDetails() {
  if (!pendingSnapshot) return;
  for (const key of pendingSnapshot.openDetails) {
    if (key.startsWith("#")) {
      const details = document.querySelector<HTMLDetailsElement>(`details${CSS.escape(key)}`);
      if (details) details.open = true;
      continue;
    }
    const summaryText = key.slice("summary:".length);
    const summary = Array.from(document.querySelectorAll<HTMLElement>("details > summary"))
      .find((item) => item.textContent?.trim() === summaryText);
    const details = summary?.parentElement as HTMLDetailsElement | null;
    if (details) details.open = true;
  }
  pendingSnapshot = null;
}

function settleSnapshot() {
  if (!document.querySelector(".admin-page")) return;
  snapshotOverlay?.remove();
  snapshotOverlay = null;
  restoreOpenDetails();
}

function isAdminMutation(url: string, method: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname.startsWith("/api/v1/lily/admin/") && ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  } catch {
    return false;
  }
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const mutation = isAdminMutation(rawUrl, method);
  if (mutation && onCatalogAdminPage()) captureAdminSnapshot();

  const response = await nativeFetch(input, init);
  if (mutation) {
    const pathname = new URL(rawUrl, window.location.origin).pathname;
    const copy = adminMutationMessage(pathname, method);
    if (response.ok) showToast(copy.success, "success");
    else showToast(`${copy.failure}: ${await responseError(response)}.`, "error");
  }
  return response;
}) as typeof window.fetch;

async function adminCatalog() {
  if (!catalogPromise) {
    catalogPromise = nativeFetch("/api/v1/lily/admin/catalog", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json() as Promise<AdminCatalogPayload>;
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

async function csrfToken() {
  const response = await nativeFetch("/api/v1/lily/auth/me", { credentials: "same-origin" });
  if (!response.ok) throw new Error(await responseError(response));
  return ((await response.json()) as AuthPayload).csrfToken;
}

async function uploadMedia(file: File, csrf: string) {
  const data = new FormData();
  data.append("file", file);
  const response = await nativeFetch("/api/v1/lily/admin/media", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrf },
    body: data
  });
  if (!response.ok) throw new Error(await responseError(response));
  return response.json() as Promise<UploadedMedia>;
}

async function setProductCover(productId: string, mediaId: string | null, csrf: string) {
  const response = await nativeFetch(`/api/v1/lily/admin/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf },
    body: JSON.stringify({ coverMediaId: mediaId })
  });
  if (!response.ok) throw new Error(await responseError(response));
}

function syncReactCoverSelect(details: HTMLDetailsElement, media: UploadedMedia | null) {
  const select = Array.from(details.querySelectorAll<HTMLSelectElement>("select")).find((candidate) => {
    const label = candidate.closest("label");
    return label?.textContent?.trim().startsWith("Capa") ?? false;
  });
  if (!select) return;
  if (media && !Array.from(select.options).some((option) => option.value === media.id)) {
    select.add(new Option(media.originalName, media.id));
  }
  select.value = media?.id ?? "";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const label = select.closest<HTMLElement>("label");
  if (label) label.style.display = "none";
}

function productCoverPanel(details: HTMLDetailsElement, product: AdminCatalogProduct) {
  const grid = details.querySelector<HTMLElement>(".admin-product-grid");
  if (!grid || grid.querySelector(`[${COVER_MARKER}]`)) return;

  const panel = document.createElement("div");
  panel.className = "cooklily-product-cover-uploader admin-span";
  panel.setAttribute(COVER_MARKER, "true");

  const visual = document.createElement("div");
  const image = product.cover ? document.createElement("img") : null;
  if (image && product.cover) {
    image.src = product.cover.url;
    image.alt = product.cover.altText || `Capa de ${product.displayName}`;
    visual.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "cooklily-product-cover-placeholder";
    placeholder.textContent = "Sem capa";
    visual.append(placeholder);
  }

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "Foto de capa";
  const description = document.createElement("small");
  description.textContent = "Envie JPEG, PNG ou WebP de até 10 MB diretamente neste produto.";
  const actions = document.createElement("div");
  actions.className = "cooklily-product-cover-actions";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.hidden = true;
  const upload = document.createElement("button");
  upload.type = "button";
  upload.className = "button ghost";
  upload.textContent = product.cover ? "Substituir foto" : "Enviar foto de capa";
  upload.addEventListener("click", () => input.click());
  actions.append(upload, input);

  if (product.cover) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button ghost";
    remove.textContent = "Remover capa";
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try {
        const csrf = await csrfToken();
        await setProductCover(product.id, null, csrf);
        catalogPromise = null;
        syncReactCoverSelect(details, null);
        visual.replaceChildren();
        const placeholder = document.createElement("div");
        placeholder.className = "cooklily-product-cover-placeholder";
        placeholder.textContent = "Sem capa";
        visual.append(placeholder);
        upload.textContent = "Enviar foto de capa";
        remove.remove();
        showToast(`Foto de capa de “${product.displayName}” removida com sucesso.`, "success");
      } catch (cause) {
        showToast(`Falha ao remover a capa de “${product.displayName}”: ${cause instanceof Error ? cause.message : "erro desconhecido"}.`, "error");
      } finally {
        remove.disabled = false;
      }
    });
    actions.append(remove);
  }

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!allowedImageTypes.has(file.type)) {
      showToast("Falha ao enviar capa: use JPEG, PNG ou WebP.", "error");
      return;
    }
    if (file.size > maxImageBytes) {
      showToast("Falha ao enviar capa: a imagem deve ter no máximo 10 MB.", "error");
      return;
    }

    upload.disabled = true;
    upload.textContent = "Enviando...";
    try {
      const csrf = await csrfToken();
      const media = await uploadMedia(file, csrf);
      await setProductCover(product.id, media.id, csrf);
      catalogPromise = null;
      syncReactCoverSelect(details, media);
      const nextImage = document.createElement("img");
      nextImage.src = media.url;
      nextImage.alt = media.altText || `Capa de ${product.displayName}`;
      visual.replaceChildren(nextImage);
      upload.textContent = "Substituir foto";
      showToast(`Foto de capa de “${product.displayName}” atualizada com sucesso.`, "success");
    } catch (cause) {
      upload.textContent = product.cover ? "Substituir foto" : "Enviar foto de capa";
      showToast(`Falha ao atualizar a capa de “${product.displayName}”: ${cause instanceof Error ? cause.message : "erro desconhecido"}.`, "error");
    } finally {
      upload.disabled = false;
    }
  });

  content.append(title, description, actions);
  panel.append(visual, content);
  grid.prepend(panel);
  syncReactCoverSelect(details, product.cover ? {
    id: product.cover.id,
    url: product.cover.url,
    originalName: "Capa atual",
    altText: product.cover.altText ?? ""
  } : null);
}

async function mountProductCoverUploaders() {
  if (!onCatalogAdminPage()) return;
  const details = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.admin-product"))
    .filter((item) => !item.querySelector(`[${COVER_MARKER}]`));
  if (details.length === 0) return;

  try {
    const catalog = await adminCatalog();
    for (const item of details) {
      const product = catalog.products.find((candidate) => candidate.slug === item.id);
      if (product) productCoverPanel(item, product);
    }
  } catch {
    // O painel React continua responsável pelo erro de autenticação/carregamento.
  }
}

const observer = new MutationObserver(() => {
  showSnapshotOverLoading();
  settleSnapshot();
  void mountProductCoverUploaders();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("DOMContentLoaded", () => void mountProductCoverUploaders());
window.addEventListener("popstate", () => void mountProductCoverUploaders());
ensureStyles();
void mountProductCoverUploaders();
