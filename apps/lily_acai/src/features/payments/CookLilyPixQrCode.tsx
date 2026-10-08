import { useEffect, useRef, useState } from "react";
import { renderQr } from "../../../../qr_manipulator/src/lib/render";
import type { QrProject } from "../../../../qr_manipulator/src/lib/project";

type Props = {
  payload: string | null;
  fallbackBase64: string | null;
};

type RenderState = "rendering" | "ready" | "fallback" | "error";

function projectFor(payload: string, errorCorrection: "M" | "L"): QrProject {
  return {
    schemaVersion: 1,
    name: "Pix CookLily",
    payloadKind: "text",
    value: payload,
    secondaryValue: "",
    wifiSecurity: "WPA",
    wifiHidden: false,
    tracking: { enabled: false, id: "", campaign: "", variant: "" },
    errorCorrection,
    size: 480,
    margin: 4,
    foreground: "#44042D",
    background: "#FFF7FA",
    moduleStyle: "dot",
    moduleScale: 0.78,
    eyeStyle: "rounded",
    eyeScale: 0.94,
    backgroundImage: null,
    backgroundImageOpacity: 0,
    surfaceOpacity: 1,
    logoImage: null,
    logoScale: 0.18,
    logoPadding: 0.9,
    logoRadius: 0.8,
    removeLogoBackground: false,
    removalThreshold: 48,
    updatedAt: new Date().toISOString()
  };
}

function isCapacityError(cause: unknown) {
  return cause instanceof Error && cause.message.toLowerCase().includes("excede o limite");
}

export function CookLilyPixQrCode({ payload, fallbackBase64 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<RenderState>("rendering");

  useEffect(() => {
    let cancelled = false;
    const target = canvas.current;

    if (!payload || !target) {
      setState(fallbackBase64 ? "fallback" : "error");
      return () => { cancelled = true; };
    }

    setState("rendering");
    const render = renderQr(target, projectFor(payload, "M"), payload).catch((cause: unknown) => {
      if (!isCapacityError(cause)) throw cause;
      return renderQr(target, projectFor(payload, "L"), payload);
    });

    void render.then(() => {
      if (!cancelled) setState("ready");
    }).catch(() => {
      if (!cancelled) setState(fallbackBase64 ? "fallback" : "error");
    });

    return () => { cancelled = true; };
  }, [payload, fallbackBase64]);

  return (
    <div className="cooklily-pix-qr-renderer">
      {state === "fallback" && fallbackBase64
        ? <img className="cooklily-pix-qr-image" src={`data:image/png;base64,${fallbackBase64}`} alt="QR Code Pix" />
        : <canvas
            ref={canvas}
            className="cooklily-pix-qr-canvas"
            role="img"
            aria-label="QR Code Pix CookLily com pontos e olhos arredondados"
          />}
      {state === "rendering" && <span className="cooklily-pix-qr-status">Preparando QR Code…</span>}
      {state === "error" && <p className="cooklily-pix-qr-error" role="status">
        Não foi possível montar a imagem do QR neste navegador. Você ainda pode copiar o código Pix abaixo.
      </p>}
    </div>
  );
}
