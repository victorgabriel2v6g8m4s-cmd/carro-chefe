export type ImageCropOptions = {
  aspectRatio: number;
  title: string;
  description: string;
  maxOutputBytes?: number;
  maxLongEdge?: number;
  initialZoom?: number;
};

type CropState = {
  zoom: number;
  x: number;
  y: number;
};

const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_LONG_EDGE = 1600;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function allowedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("Não foi possível ler a imagem."));
        return;
      }
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    image.src = url;
  });
}

function clampCropState(
  state: CropState,
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  baseScale: number
) {
  const scale = baseScale * state.zoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  return {
    ...state,
    x: Math.min(0, Math.max(viewportWidth - displayWidth, state.x)),
    y: Math.min(0, Math.max(viewportHeight - displayHeight, state.y))
  };
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível processar a imagem."));
    }, type, quality);
  });
}

async function encodeCrop(
  image: HTMLImageElement,
  state: CropState,
  viewportWidth: number,
  viewportHeight: number,
  baseScale: number,
  maxLongEdge: number,
  quality: number
) {
  const displayScale = baseScale * state.zoom;
  const sourceX = Math.max(0, Math.min(image.naturalWidth, -state.x / displayScale));
  const sourceY = Math.max(0, Math.min(image.naturalHeight, -state.y / displayScale));
  const sourceWidth = Math.min(image.naturalWidth - sourceX, viewportWidth / displayScale);
  const sourceHeight = Math.min(image.naturalHeight - sourceY, viewportHeight / displayScale);
  const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  try {
    return await blobFromCanvas(canvas, "image/webp", quality);
  } catch {
    return blobFromCanvas(canvas, "image/jpeg", quality);
  }
}

async function createOutputFile(
  image: HTMLImageElement,
  state: CropState,
  viewportWidth: number,
  viewportHeight: number,
  baseScale: number,
  originalName: string,
  maxOutputBytes: number,
  maxLongEdge: number
) {
  const qualities = [0.86, 0.76, 0.66, 0.56, 0.48];
  let currentLongEdge = maxLongEdge;

  for (let round = 0; round < 7; round += 1) {
    for (const quality of qualities) {
      const blob = await encodeCrop(
        image,
        state,
        viewportWidth,
        viewportHeight,
        baseScale,
        currentLongEdge,
        quality
      );
      if (blob.size <= maxOutputBytes) {
        const stem = originalName.replace(/.[^.]+$/, "") || "imagem";
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        return new File([blob], `${stem}-recortada.${extension}`, {
          type: blob.type,
          lastModified: Date.now()
        });
      }
    }
    currentLongEdge = Math.max(640, Math.round(currentLongEdge * 0.84));
  }

  throw new Error("Não foi possível comprimir a imagem para o limite de 5 MB.");
}

export async function openImageCropper(
  file: File,
  options: ImageCropOptions
): Promise<File | null> {
  if (!allowedImage(file)) {
    throw new Error("Formato não permitido. Use JPEG, PNG ou WebP.");
  }

  const image = await loadImage(file);
  const aspectRatio = Math.max(0.2, Math.min(5, options.aspectRatio));
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
  const initialZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, options.initialZoom ?? 1));

  const maxViewportHeight = Math.max(260, window.innerHeight * 0.58);
  const maxViewportWidth = Math.min(430, Math.max(260, window.innerWidth - 36), maxViewportHeight * aspectRatio);
  const viewportWidth = Math.round(maxViewportWidth);
  const viewportHeight = Math.round(viewportWidth / aspectRatio);
  const baseScale = Math.max(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
  const initialDisplayScale = baseScale * initialZoom;
  const initialState = clampCropState({
    zoom: initialZoom,
    x: (viewportWidth - image.naturalWidth * initialDisplayScale) / 2,
    y: (viewportHeight - image.naturalHeight * initialDisplayScale) / 2
  }, viewportWidth, viewportHeight, image.naturalWidth, image.naturalHeight, baseScale);

  return new Promise<File | null>((resolve) => {
    let settled = false;
    let state = initialState;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let saveBusy = false;

    const overlay = document.createElement("div");
    overlay.className = "cooklily-image-cropper";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", options.title);

    const dialog = document.createElement("section");
    dialog.className = "cooklily-image-cropper-dialog";

    const header = document.createElement("header");
    header.className = "cooklily-image-cropper-header";
    const title = document.createElement("strong");
    title.textContent = options.title;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "cooklily-image-cropper-close";
    close.setAttribute("aria-label", "Cancelar edição");
    close.textContent = "×";
    header.append(title, close);

    const description = document.createElement("p");
    description.className = "cooklily-image-cropper-description";
    description.textContent = options.description;

    const viewport = document.createElement("div");
    viewport.className = "cooklily-image-cropper-viewport";
    viewport.style.width = `${viewportWidth}px`;
    viewport.style.height = `${viewportHeight}px`;
    const imageElement = document.createElement("img");
    imageElement.src = image.src;
    imageElement.alt = "Pré-visualização do corte";
    imageElement.draggable = false;
    const circle = document.createElement("div");
    circle.className = "cooklily-image-cropper-circle";
    circle.setAttribute("aria-hidden", "true");
    viewport.append(imageElement, circle);

    const controls = document.createElement("div");
    controls.className = "cooklily-image-cropper-controls";
    const zoomLabel = document.createElement("label");
    zoomLabel.className = "cooklily-image-cropper-zoom";
    const zoomText = document.createElement("span");
    zoomText.textContent = "Ajustar enquadramento";
    const zoom = document.createElement("input");
    zoom.type = "range";
    zoom.min = String(MIN_ZOOM);
    zoom.max = String(MAX_ZOOM);
    zoom.step = "0.01";
    zoom.value = String(state.zoom);
    zoom.setAttribute("aria-label", "Aproximar ou afastar");
    zoomLabel.append(zoomText, zoom);
    const hint = document.createElement("small");
    hint.textContent = "Arraste a foto para escolher a posição. Use o controle para aproximar.";
    controls.append(zoomLabel, hint);

    const actions = document.createElement("div");
    actions.className = "cooklily-image-cropper-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "button ghost";
    cancel.textContent = "Cancelar";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "button primary";
    save.textContent = "Usar esta foto";
    actions.append(cancel, save);

    dialog.append(header, description, viewport, controls, actions);
    overlay.append(dialog);
    document.body.append(overlay);

    const render = () => {
      const scale = baseScale * state.zoom;
      imageElement.style.width = `${image.naturalWidth * scale}px`;
      imageElement.style.height = `${image.naturalHeight * scale}px`;
      imageElement.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      zoom.value = String(state.zoom);
    };

    const finish = (value: File | null) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(value);
    };

    const cancelCrop = () => {
      if (!saveBusy) finish(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelCrop();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (saveBusy) return;
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-dragging");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      state = clampCropState({
        ...state,
        x: state.x + event.clientX - pointerX,
        y: state.y + event.clientY - pointerY
      }, viewportWidth, viewportHeight, image.naturalWidth, image.naturalHeight, baseScale);
      pointerX = event.clientX;
      pointerY = event.clientY;
      render();
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      viewport.releasePointerCapture(event.pointerId);
      viewport.classList.remove("is-dragging");
    };

    const onZoom = () => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(zoom.value)));
      const oldScale = baseScale * state.zoom;
      const focusSourceX = (viewportWidth / 2 - state.x) / oldScale;
      const focusSourceY = (viewportHeight / 2 - state.y) / oldScale;
      const nextScale = baseScale * nextZoom;
      state = clampCropState({
        zoom: nextZoom,
        x: viewportWidth / 2 - focusSourceX * nextScale,
        y: viewportHeight / 2 - focusSourceY * nextScale
      }, viewportWidth, viewportHeight, image.naturalWidth, image.naturalHeight, baseScale);
      render();
    };

    const saveCrop = async () => {
      if (saveBusy) return;
      saveBusy = true;
      save.disabled = true;
      cancel.disabled = true;
      close.disabled = true;
      save.textContent = "Preparando…";
      try {
        const output = await createOutputFile(
          image,
          state,
          viewportWidth,
          viewportHeight,
          baseScale,
          file.name,
          maxOutputBytes,
          maxLongEdge
        );
        finish(output);
      } catch (error) {
        saveBusy = false;
        save.disabled = false;
        cancel.disabled = false;
        close.disabled = false;
        save.textContent = "Tentar novamente";
        const message = error instanceof Error ? error.message : "Não foi possível processar a imagem.";
        hint.textContent = message;
      }
    };

    close.addEventListener("click", cancelCrop);
    cancel.addEventListener("click", cancelCrop);
    save.addEventListener("click", () => void saveCrop());
    zoom.addEventListener("input", onZoom);
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("keydown", onKeyDown);
    render();
    close.focus();
  });
}
