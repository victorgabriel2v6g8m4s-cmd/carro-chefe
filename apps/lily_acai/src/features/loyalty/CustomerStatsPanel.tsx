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
  const max = Math.max(100, ...categories.map(({ key }) => stats.totals[key]));
  const values = categories.map(({ key }) => Math.min(1, stats.totals[key] / max));
  const point = (index: number, scale: number) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / 5; return [center + Math.cos(angle) * radius * scale, center + Math.sin(angle) * radius * scale] as const; };
  return <svg className="customer-stats-radar" viewBox="0 0 240 240" role="img" aria-labelledby="stats-radar-title stats-radar-description">
    <title id="stats-radar-title">Habilidades</title><desc id="stats-radar-description">Missões, atividade, pesquisas, pedidos e indicações.</desc>
    {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={categories.map((_, index) => point(index, scale).join(",")).join(" ")} className="stats-radar-grid" />)}
    {categories.map((item, index) => { const [x, y] = point(index, 1); return <line key={item.key} x1={center} y1={center} x2={x} y2={y} className="stats-radar-axis" />; })}
    <polygon points={values.map((value, index) => point(index, Math.max(.06, value)).join(",")).join(" ")} className="stats-radar-area" />
    {values.map((value, index) => { const [x, y] = point(index, Math.max(.06, value)); return <circle key={categories[index]!.key} cx={x} cy={y} r="4" className="stats-radar-point" />; })}
    {categories.map((item, index) => { const [x, y] = point(index, 1.22); return <text key={item.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{item.label}</text>; })}
  </svg>;
}

type ActivityBucket = LilyCustomerStats["months"][number];

function ActivityChart({ values, metric }: { values: ActivityBucket[]; metric: typeof categories[number] }) {
  const max = Math.max(1, ...values.map((item) => item[metric.key]));
  return <div className="customer-monthly-chart">
    {values.map((item) => <div className="customer-month-column" key={item.key}><span style={{ height: `${Math.max(4, item[metric.key] / max * 100)}%`, background: metric.color }} /><small>{item.label}</small><b>{item[metric.key]}</b></div>)}
  </div>;
}

export function CustomerStatsPanel({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [stats, setStats] = useState<LilyCustomerStats | null>(null);
  const [error, setError] = useState("");
  const [weekly, setWeekly] = useState(false);
  useEffect(() => {
    let active = true;
    void getLilyCustomerStats(userId).then((value) => { if (active) setStats(value); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as estatísticas."); });
    return () => { active = false; };
  }, [userId]);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!stats) return <section className="customer-stats-panel" aria-live="polite"><p>Carregando estatísticas…</p></section>;
  const values = compact && weekly ? stats.days : stats.months;
  return <section className={`customer-stats-panel${compact ? " is-compact" : ""}`} aria-label="Estatísticas">
    {compact && <header className="customer-stats-toolbar"><h2>Progresso</h2><div className="customer-stats-period" role="group" aria-label="Período"><button type="button" aria-pressed={weekly} onClick={() => setWeekly(true)}>Semanal</button><button type="button" aria-pressed={!weekly} onClick={() => setWeekly(false)}>Mensal</button></div></header>}
    {!compact && <header className="customer-stats-heading"><div><span className="eyebrow">Desempenho CookLily</span><h2>{stats.user.displayName}</h2><p>{stats.points.toLocaleString("pt-BR")} pontos acumulados · {stats.currentLevel?.name ?? "Sem nível"}</p></div></header>}
    <div className="customer-stats-overview"><article className="customer-radar-card"><h3>Habilidades</h3><RadarChart stats={stats} /></article><article className="customer-activity-card"><h3>Atividade</h3><ActivityChart values={values} metric={categories[1]} /><strong>{weekly ? values.filter((day) => day.activity > 0).length : stats.activeDays} dias ativos</strong></article></div>
    <div className="customer-stat-grid">{categories.map((category) => <article className="customer-stat-card" key={category.key}><div><h3>{category.label}</h3><strong>{values.reduce((sum, bucket) => sum + bucket[category.key], 0)}</strong></div><ActivityChart values={values} metric={category} /><p>{stats.totals[category.key].toLocaleString("pt-BR")} pontos nesta categoria</p></article>)}</div>
  </section>;
}
