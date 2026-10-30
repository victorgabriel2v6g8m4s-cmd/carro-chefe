import { useEffect, useState } from "react";
import { getLilyCustomerStats, type LilyCustomerStats } from "../../api";

const categories = [
  { key: "missions", label: "Missões", color: "#820023" },
  { key: "activity", label: "Atividade", color: "#b44b72" },
  { key: "surveys", label: "Pesquisas", color: "#74436a" },
  { key: "orders", label: "Pedidos", color: "#d4879c" },
  { key: "referrals", label: "Indicações", color: "#44042d" }
] as const;

function RadarChart({ stats }: { stats: LilyCustomerStats }) {
  const center = 120;
  const radius = 82;
  const values = categories.map(({ key }) => Math.min(1, stats.totals[key] / Math.max(100, ...categories.map(({ key: item }) => stats.totals[item]))));
  const point = (index: number, scale: number) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / 5; return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`; };
  return <svg className="customer-stats-radar" viewBox="0 0 240 240" role="img" aria-labelledby="stats-radar-title stats-radar-description">
    <title id="stats-radar-title">Gráfico de habilidades CookLily</title><desc id="stats-radar-description">Compara missões, atividade, pesquisas, pedidos e indicações.</desc>
    {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={categories.map((_, index) => point(index, scale)).join(" ")} className="stats-radar-grid" />)}
    {categories.map((item, index) => <line key={item.key} x1={center} y1={center} x2={point(index, 1).split(",")[0]} y2={point(index, 1).split(",")[1]} className="stats-radar-axis" />)}
    <polygon points={values.map((value, index) => point(index, Math.max(.06, value))).join(" ")} className="stats-radar-area" />
    {values.map((value, index) => <circle key={categories[index]!.key} cx={point(index, Math.max(.06, value)).split(",")[0]} cy={point(index, Math.max(.06, value)).split(",")[1]} r="4" className="stats-radar-point" />)}
    {categories.map((item, index) => { const [x, y] = point(index, 1.22).split(","); return <text key={item.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{item.label}</text>; })}
  </svg>;
}

function MonthlyChart({ stats, metric }: { stats: LilyCustomerStats; metric: typeof categories[number] }) {
  const max = Math.max(1, ...stats.months.map((month) => month[metric.key]));
  return <div className="customer-monthly-chart" role="img" aria-label={`${metric.label} nos últimos seis meses`}>
    {stats.months.map((month) => <div className="customer-month-column" key={month.key} title={`${month.label}: ${month[metric.key]}`}><span style={{ height: `${Math.max(4, month[metric.key] / max * 100)}%`, background: metric.color }} /><small>{month.label}</small><b>{month[metric.key]}</b></div>)}
  </div>;
}

export function CustomerStatsPanel({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [stats, setStats] = useState<LilyCustomerStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getLilyCustomerStats(userId).then((value) => { if (active) setStats(value); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as estatísticas."); }); return () => { active = false; }; }, [userId]);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!stats) return <section className="customer-stats-panel" aria-live="polite"><p>Carregando estatísticas…</p></section>;
  return <section className={`customer-stats-panel${compact ? " is-compact" : ""}`} aria-label="Estatísticas de desempenho">
    {!compact && <header className="customer-stats-heading"><div><span className="eyebrow">Desempenho CookLily</span><h2>{stats.user.displayName}</h2><p>{stats.points.toLocaleString("pt-BR")} pontos acumulados · {stats.currentLevel?.name ?? "Sem nível"}</p></div></header>}
    <div className="customer-stats-overview"><article className="customer-radar-card"><h3>Habilidades</h3><RadarChart stats={stats} /></article><article className="customer-activity-card"><h3>Frequência de atividade</h3><MonthlyChart stats={stats} metric={categories[1]} /><strong>{stats.activeDays} dias ativos neste período</strong><small>Nos últimos seis meses</small></article></div>
    <div className="customer-stat-grid">{categories.map((item) => <article className="customer-stat-card" key={item.key}><div><h3>{item.label}</h3><strong>{item.key === "orders" ? stats.counts.orders : item.key === "surveys" ? stats.counts.surveys : item.key === "referrals" ? stats.counts.referrals : stats.months.reduce((sum, month) => sum + month[item.key], 0)}</strong></div><MonthlyChart stats={stats} metric={item} /><p>{stats.totals[item.key].toLocaleString("pt-BR")} pontos nesta categoria</p></article>)}</div>
  </section>;
}
