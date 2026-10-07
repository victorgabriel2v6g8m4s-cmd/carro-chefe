type FlavorCover = {
  id: string;
  slug: string;
  name: string;
  status: string;
  premium: boolean;
  cover: null | {
    id: string;
    url: string;
    originalName: string;
    altText: string;
  };
};

type FlavorCoverPayload = { flavors: FlavorCover[] };
type SessionPayload = { csrfToken: string };
type UploadedMedia = { id: string; url: string; originalName: string; altText: string };

const PANEL_ID = "lily-flavor-cover-upload-panel";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

async function parseResponse<T>(response: Response): Promise<T> {
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body.error === "string"
      ? body.error
      : "Não foi possível concluir a solicitação.";
    throw new Error(message);
  }
  return body as T;
}

async function csrfToken() {
  const response = await fetch("/api/v1/lily/auth/me", { credentials: "same-origin" });
  return (await parseResponse<SessionPayload>(response)).csrfToken;
}

async function getFlavorCovers() {
  const response = await fetch("/api/v1/lily/admin/flavor-covers", { credentials: "same-origin" });
  return parseResponse<FlavorCoverPayload>(response);
}

async function uploadMedia(file: File, csrf: string) {
  const data = new FormData();
  data.append("file", file);
  const response = await fetch("/api/v1/lily/admin/media", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrf },
    body: data
  });
  return parseResponse<UploadedMedia>(response);
}

async function setFlavorCover(flavorId: string, mediaId: string | null, csrf: string) {
  const response = await fetch(`/api/v1/lily/admin/flavors/${encodeURIComponent(flavorId)}/cover`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrf
    },
    body: JSON.stringify({ mediaId })
  });
  return parseResponse<unknown>(response);
}

function button(label: string) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "button ghost";
  element.textContent = label;
  return element;
}

function buildFlavorRow(flavor: FlavorCover, onRefresh: () => Promise<void>) {
  const row = document.createElement("div");
  row.className = "admin-allergen-component";
  row.style.display = "grid";
  row.style.gridTemplateColumns = "minmax(90px, 120px) minmax(0, 1fr)";
  row.style.gap = "12px";
  row.style.alignItems = "center";
  row.style.padding = "12px";

  const visual = document.createElement("div");
  visual.style.aspectRatio = "1 / 1";
  visual.style.borderRadius = "14px";
  visual.style.overflow = "hidden";
  visual.style.background = "rgba(255,255,255,.06)";
  visual.style.display = "grid";
  visual.style.placeItems = "center";

  if (flavor.cover) {
    const image = document.createElement("img");
    image.src = flavor.cover.url;
    image.alt = flavor.cover.altText || `Capa do sabor ${flavor.name}`;
    image.loading = "lazy";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    visual.append(image);
  } else {
    const placeholder = document.createElement("small");
    placeholder.textContent = "Sem capa";
    visual.append(placeholder);
  }

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = flavor.name;
  content.append(title);

  const current = document.createElement("div");
  current.style.margin = "6px 0 10px";
  current.style.opacity = ".78";
  current.style.fontSize = ".9rem";
  current.textContent = flavor.cover ? flavor.cover.originalName : "Nenhuma foto de capa cadastrada.";
  content.append(current);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.flexWrap = "wrap";
  actions.style.gap = "8px";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.hidden = true;

  const uploadButton = button(flavor.cover ? "Substituir foto" : "Enviar foto de capa");
  const status = document.createElement("small");
  status.setAttribute("role", "status");
  status.style.display = "block";
  status.style.marginTop = "8px";

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      status.textContent = "Use uma imagem JPEG, PNG ou WebP.";
      return;
    }
    if (file.size > maxBytes) {
      status.textContent = "A imagem deve ter no máximo 10 MB.";
      return;
    }

    uploadButton.disabled = true;
    status.textContent = "Enviando foto...";
    try {
      const csrf = await csrfToken();
      const media = await uploadMedia(file, csrf);
      await setFlavorCover(flavor.id, media.id, csrf);
      status.textContent = "Foto de capa atualizada.";
      await onRefresh();
    } catch (cause) {
      status.textContent = cause instanceof Error ? cause.message : "Falha ao enviar a foto.";
    } finally {
      uploadButton.disabled = false;
    }
  });

  actions.append(uploadButton, fileInput);

  if (flavor.cover) {
    const removeButton = button("Remover capa");
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;
      status.textContent = "Removendo capa...";
      try {
        const csrf = await csrfToken();
        await setFlavorCover(flavor.id, null, csrf);
        status.textContent = "Capa removida.";
        await onRefresh();
      } catch (cause) {
        status.textContent = cause instanceof Error ? cause.message : "Falha ao remover a capa.";
      } finally {
        removeButton.disabled = false;
      }
    });
    actions.append(removeButton);
  }

  content.append(actions, status);
  row.append(visual, content);
  return row;
}

async function renderPanel(panel: HTMLElement) {
  panel.setAttribute("aria-busy", "true");
  const previousStatus = panel.querySelector<HTMLElement>("[data-cover-panel-status]");
  if (previousStatus) previousStatus.textContent = "Atualizando sabores...";

  try {
    const payload = await getFlavorCovers();
    panel.replaceChildren();

    const heading = document.createElement("h4");
    heading.textContent = "Fotos de capa dos sabores";
    const help = document.createElement("p");
    help.textContent = "Envie uma foto diretamente para cada sabor. Formatos aceitos: JPEG, PNG ou WebP, até 10 MB.";
    const status = document.createElement("small");
    status.dataset.coverPanelStatus = "true";
    status.setAttribute("role", "status");

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "10px";
    const refresh = () => renderPanel(panel);
    for (const flavor of payload.flavors) list.append(buildFlavorRow(flavor, refresh));

    if (payload.flavors.length === 0) status.textContent = "Nenhum sabor cadastrado.";
    panel.append(heading, help, list, status);
  } catch (cause) {
    panel.replaceChildren();
    const message = document.createElement("p");
    message.className = "error";
    message.setAttribute("role", "alert");
    message.textContent = cause instanceof Error ? cause.message : "Não foi possível carregar as capas dos sabores.";
    panel.append(message);
  } finally {
    panel.setAttribute("aria-busy", "false");
  }
}

function onCatalogAdminPage() {
  return /\/painel\/cardapio\/?$/.test(window.location.pathname);
}

function ensureMounted() {
  if (!onCatalogAdminPage() || document.getElementById(PANEL_ID)) return;
  const summary = Array.from(document.querySelectorAll<HTMLElement>("details.admin-create > summary"))
    .find((item) => item.textContent?.includes("Sabores e compatibilidade"));
  const details = summary?.parentElement;
  if (!details) return;

  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.className = "admin-allergen-component-list";
  panel.style.marginTop = "18px";
  const loading = document.createElement("p");
  loading.dataset.coverPanelStatus = "true";
  loading.textContent = "Carregando capas dos sabores...";
  panel.append(loading);

  const firstForm = details.querySelector("form");
  if (firstForm?.nextSibling) details.insertBefore(panel, firstForm.nextSibling);
  else details.append(panel);
  void renderPanel(panel);
}

const observer = new MutationObserver(ensureMounted);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", ensureMounted);
window.addEventListener("DOMContentLoaded", ensureMounted);
ensureMounted();
