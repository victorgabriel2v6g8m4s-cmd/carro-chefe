type PreviewLevel = { id: string; name: string; requiredPoints: number; lilyCoins: number; active: boolean };

export function LoyaltyCurvePreview({ levels }: { levels: PreviewLevel[] }) {
  const active = levels.filter((level) => level.active);
  if (!active.length) return <p className="muted">Adicione níveis ativos para visualizar a curva.</p>;

  const width = Math.max(720, active.length * 82);
  const height = 210;
  const maximum = Math.max(1, active.at(-1)?.requiredPoints ?? 1);
  const points = active.map((level, index) => ({
    level,
    x: 38 + index * ((width - 76) / Math.max(1, active.length - 1)),
    y: 145 - Math.log1p(level.requiredPoints) / Math.log1p(maximum) * 105
  }));
  const cumulativeCoins = active.reduce<number[]>((totals, level) => {
    totals.push((totals.at(-1) ?? 0) + level.lilyCoins);
    return totals;
  }, []);

  return <div className="loyalty-preview-grid">
    <section className="loyalty-preview-card" aria-labelledby="loyalty-curve-preview-title">
      <h3 id="loyalty-curve-preview-title">Prévia da curva de pontos</h3>
      <p className="muted">Escala logarítmica para comparar todos os marcos, inclusive Elite.</p>
      <div className="loyalty-curve-scroll" role="region" aria-label="Curva de níveis; role horizontalmente para ver todos os marcos" tabIndex={0}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${active.length} níveis ativos, de ${active[0].requiredPoints.toLocaleString("pt-BR")} a ${maximum.toLocaleString("pt-BR")} pontos acumulados`}>
          <path d={`M ${points.map(({ x, y }) => `${x} ${y}`).join(" L ")}`} className="loyalty-curve-line" />
          {points.map(({ level, x, y }) => <g key={level.id}>
            <circle cx={x} cy={y} r="5" className="loyalty-curve-point" />
            <text x={x} y={y - 12} textAnchor="middle" className="loyalty-curve-value">{level.requiredPoints.toLocaleString("pt-BR")}</text>
            <text x={x} y="174" textAnchor="middle" className="loyalty-curve-name">{level.name}</text>
          </g>)}
        </svg>
      </div>
    </section>
    <section className="loyalty-preview-card" aria-labelledby="loyalty-coin-preview-title">
      <h3 id="loyalty-coin-preview-title">Prévia dos ganhos de LilyCoins</h3>
      <p className="muted">Acumulado concedido ao alcançar cada nível; resgates reduzem o saldo real do cliente.</p>
      <ol className="loyalty-coin-milestones">{active.map((level, index) => <li key={level.id}>
        <span>{level.name}</span><strong>+{level.lilyCoins.toLocaleString("pt-BR")}</strong><small>{cumulativeCoins[index].toLocaleString("pt-BR")} acumuladas</small>
      </li>)}</ol>
    </section>
  </div>;
}
