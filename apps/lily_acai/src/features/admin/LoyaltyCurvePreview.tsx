import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { LoyaltyLevel } from "./loyalty-types";

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 520;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.05;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function LoyaltyCurvePreview({ levels }: { levels: LoyaltyLevel[] }) {
  const active = levels.filter((level) => level.active);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [zoom, setZoom] = useState(0.8);
  const [panEnabled, setPanEnabled] = useState(false);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const points = useMemo(() => {
    const maxPoints = Math.max(1, active.at(-1)?.requiredPoints ?? 1);
    return active.map((level, index) => ({
      level,
      x: 72 + index * (CHART_WIDTH - 144) / Math.max(1, active.length - 1),
      y: 400 - Math.log1p(Math.max(0, level.requiredPoints)) / Math.log1p(maxPoints) * 285
    }));
  }, [active]);
  const curvePath = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const maxScrollLeft = Math.max(0, CHART_WIDTH * zoom - (viewportRef.current?.clientWidth ?? CHART_WIDTH));
  const maxScrollTop = Math.max(0, CHART_HEIGHT * zoom - (viewportRef.current?.clientHeight ?? CHART_HEIGHT));
  const viewRect = {
    x: CHART_WIDTH * scroll.left / Math.max(1, CHART_WIDTH * zoom),
    y: CHART_HEIGHT * scroll.top / Math.max(1, CHART_HEIGHT * zoom),
    width: CHART_WIDTH * Math.min(1, (viewportRef.current?.clientWidth ?? CHART_WIDTH) / Math.max(1, CHART_WIDTH * zoom)),
    height: CHART_HEIGHT * Math.min(1, (viewportRef.current?.clientHeight ?? CHART_HEIGHT) / Math.max(1, CHART_HEIGHT * zoom))
  };

  function rememberScroll() {
    const node = viewportRef.current;
    if (node) setScroll({ left: node.scrollLeft, top: node.scrollTop });
  }

  function setZoomAt(nextZoom: number, clientX?: number, clientY?: number) {
    const node = viewportRef.current;
    const next = clamp(Math.round(nextZoom / ZOOM_STEP) * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    if (node && clientX !== undefined && clientY !== undefined) {
      const rect = node.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const anchorX = (node.scrollLeft + localX) / zoom;
      const anchorY = (node.scrollTop + localY) / zoom;
      setZoom(next);
      requestAnimationFrame(() => {
        if (!viewportRef.current) return;
        viewportRef.current.scrollLeft = Math.max(0, anchorX * next - localX);
        viewportRef.current.scrollTop = Math.max(0, anchorY * next - localY);
        rememberScroll();
      });
      return;
    }
    setZoom(next);
    requestAnimationFrame(rememberScroll);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoomAt(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), event.clientX, event.clientY);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (panEnabled && event.button === 0) {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const node = viewportRef.current;
    if (!node) return;
    const previous = pointersRef.current.get(event.pointerId);
    if (event.pointerType === "touch" && previous) {
      const others = [...pointersRef.current.entries()].filter(([id]) => id !== event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (others.length) {
        const other = others[0][1];
        const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
        const newDistance = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (oldDistance > 0) setZoomAt(zoom * newDistance / oldDistance, (event.clientX + other.x) / 2, (event.clientY + other.y) / 2);
      } else if (!panEnabled) {
        window.scrollBy(0, previous.y - event.clientY);
      }
      event.preventDefault();
    }
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      node.scrollLeft = drag.left - (event.clientX - drag.x);
      node.scrollTop = drag.top - (event.clientY - drag.y);
      rememberScroll();
      event.preventDefault();
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    rememberScroll();
  }

  function moveToMinimap(event: PointerEvent<SVGSVGElement>) {
    const node = viewportRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!node || !rect.width || !rect.height) return;
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    node.scrollLeft = x * Math.max(0, CHART_WIDTH * zoom - node.clientWidth);
    node.scrollTop = y * Math.max(0, CHART_HEIGHT * zoom - node.clientHeight);
    rememberScroll();
  }

  function fitToScreen() {
    const node = viewportRef.current;
    if (!node) return;
    const fit = clamp(Math.min(node.clientWidth / CHART_WIDTH, node.clientHeight / CHART_HEIGHT), MIN_ZOOM, 1);
    setZoom(fit);
    node.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    setScroll({ left: 0, top: 0 });
  }

  const cumulativeCoins = active.reduce<number[]>((total, level) => { total.push((total.at(-1) ?? 0) + level.lilyCoins); return total; }, []);
  if (!active.length) return <p className="muted">Adicione níveis ativos para visualizar a curva.</p>;

  return <div className="loyalty-preview-stack">
    <section className="loyalty-preview-card loyalty-curve-panel" aria-labelledby="loyalty-curve-preview-title">
      <div className="loyalty-curve-heading"><div><span className="eyebrow">Progressão por pontos</span><h3 id="loyalty-curve-preview-title">Prévia da curva de níveis</h3><p className="muted">Escala logarítmica para comparar todos os marcos, inclusive Elite. Use o zoom, as barras de rolagem ou a ferramenta de pan.</p></div><div className="loyalty-curve-summary"><strong>{active.length} níveis</strong><small>{active[0].requiredPoints.toLocaleString("pt-BR")} → {active.at(-1)!.requiredPoints.toLocaleString("pt-BR")} pontos</small></div></div>
      <div className="loyalty-curve-tools" aria-label="Ferramentas da curva">
        <button className="button ghost" type="button" aria-pressed={panEnabled} onClick={() => setPanEnabled((enabled) => !enabled)}>{panEnabled ? "Pan ativado" : "Ativar pan"}</button>
        <button className="button ghost" type="button" onClick={fitToScreen}>Ajustar à tela</button>
        <div className="loyalty-zoom-control"><button type="button" aria-label="Diminuir zoom" onClick={() => setZoomAt(zoom - ZOOM_STEP)}>−</button><label htmlFor="loyalty-curve-zoom">Zoom {Math.round(zoom * 100)}%</label><input id="loyalty-curve-zoom" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={ZOOM_STEP} value={zoom} onChange={(event) => setZoomAt(Number(event.target.value))} /><button type="button" aria-label="Aumentar zoom" onClick={() => setZoomAt(zoom + ZOOM_STEP)}>+</button></div>
      </div>
      <div className="loyalty-curve-stage">
        <div ref={viewportRef} className={`loyalty-curve-viewport${panEnabled ? " pan-enabled" : ""}`} role="region" aria-label="Gráfico da curva de níveis. Use Ctrl mais rolagem para aproximar no desktop; no celular, gesto de pinça. As barras de rolagem ou Pan percorrem os eixos." tabIndex={0} onScroll={rememberScroll} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
          <svg className="loyalty-curve-svg" width={CHART_WIDTH * zoom} height={CHART_HEIGHT * zoom} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${active.length} níveis ativos; de ${active[0].requiredPoints.toLocaleString("pt-BR")} a ${active.at(-1)!.requiredPoints.toLocaleString("pt-BR")} pontos acumulados`}>
            <text x="34" y="28" className="loyalty-chart-axis-title">Pontos acumulados · escala logarítmica</text>
            {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="68" x2="1152" y1={82 + tick * 79} y2={82 + tick * 79} className="loyalty-chart-grid" /><text x="60" y={86 + tick * 79} textAnchor="end" className="loyalty-chart-tick">{tick === 4 ? active.at(-1)!.requiredPoints.toLocaleString("pt-BR") : ""}</text></g>)}
            <polyline points={curvePath} className="loyalty-curve-line" />
            {points.map(({ level, x, y }, index) => <g key={level.id} className="loyalty-curve-point-group"><title>{`${level.name}: ${level.requiredPoints.toLocaleString("pt-BR")} pontos; ${level.lilyCoins.toLocaleString("pt-BR")} LilyCoins ao atingir`}</title><circle cx={x} cy={y} r="7" className="loyalty-curve-point" /><text x={x} y="438" textAnchor="middle" className="loyalty-curve-name">{index % 2 === 0 || index === points.length - 1 ? level.name : ""}</text><text x={x} y="459" textAnchor="middle" className="loyalty-curve-value">{index % 2 === 0 || index === points.length - 1 ? level.requiredPoints.toLocaleString("pt-BR") : ""}</text></g>)}
            <text x="610" y="498" textAnchor="middle" className="loyalty-chart-axis-title">Níveis CookLily</text>
          </svg>
        </div>
        <div className="loyalty-chart-minimap-wrap"><span>Mapa do zoom</span><svg className="loyalty-chart-minimap" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="slider" aria-label="Mapa de navegação da curva" aria-valuetext={`Posição horizontal ${Math.round(scroll.left / Math.max(1, maxScrollLeft) * 100)}%, vertical ${Math.round(scroll.top / Math.max(1, maxScrollTop) * 100)}%`} tabIndex={0} onPointerDown={moveToMinimap} onPointerMove={(event) => { if (event.buttons) moveToMinimap(event); }} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); const node = viewportRef.current; if (node) { node.scrollLeft += event.key === "ArrowLeft" ? -60 : event.key === "ArrowRight" ? 60 : 0; node.scrollTop += event.key === "ArrowUp" ? -60 : event.key === "ArrowDown" ? 60 : 0; rememberScroll(); } } }}><polyline points={curvePath} className="loyalty-minimap-line" />{points.map(({ level, x, y }) => <circle key={level.id} cx={x} cy={y} r="4" className="loyalty-minimap-point" />)}<rect x={viewRect.x} y={viewRect.y} width={viewRect.width} height={viewRect.height} className="loyalty-minimap-window" /></svg></div>
      </div>
      <p className="loyalty-curve-accessibility muted">A lista abaixo contém os ganhos exatos por nível. Foque o gráfico para navegar por teclado; os detalhes de cada marco aparecem ao focar ou apontar.</p>
    </section>
    <section className="loyalty-preview-card loyalty-coin-preview" aria-labelledby="loyalty-coin-preview-title">
      <div><span className="eyebrow">Ganhos de moeda</span><h3 id="loyalty-coin-preview-title">Prévia acumulada de LilyCoins</h3><p className="muted">Moedas concedidas ao alcançar cada nível. Resgates reduzem o saldo; a progressão em pontos permanece.</p></div>
      <ol className="loyalty-coin-milestones">{active.map((level, index) => <li key={level.id}>{level.iconUrl ? <img src={level.iconUrl} alt="" /> : <span className="loyalty-coin-level-icon" aria-hidden="true">✦</span>}<span>{level.name}</span><strong>+{level.lilyCoins.toLocaleString("pt-BR")}</strong><small>{cumulativeCoins[index].toLocaleString("pt-BR")} acumuladas</small></li>)}</ol>
    </section>
  </div>;
}
