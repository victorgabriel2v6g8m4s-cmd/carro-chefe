import { useEffect, useRef, useState } from "react";
import { Link } from "../../router";
import { getLilyRanking, type LilyRankingRow } from "../../api";
import { landingCopy as copy } from "./landing-copy";

const RANKING_PAGE_SIZE = 20;

function RankingRow({ row }: { row: LilyRankingRow }) {
  return <li className="landing-ranking-row"><strong className="landing-ranking-position">#{row.rank}</strong>{row.avatarUrl ? <img src={row.avatarUrl} alt="" loading="lazy" /> : <span className="landing-ranking-avatar" aria-hidden="true">{row.displayName.trim().charAt(0).toUpperCase()}</span>}<div><strong>{row.displayName}</strong><small>{row.currentLevel?.name ?? "Sem nível"}</small></div><span className="landing-ranking-points">{row.points.toLocaleString("pt-BR")} <small>pts</small></span></li>;
}

export function LandingCommunitySidebar({ enabled }: { enabled: boolean }) {
  const [ranking, setRanking] = useState<LilyRankingRow[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const column = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingLock = useRef(false);

  useEffect(() => {
    if (!enabled || !column.current || started) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect(); }
    }, { rootMargin: "320px" });
    observer.observe(column.current);
    return () => observer.disconnect();
  }, [enabled, started]);

  useEffect(() => {
    if (!enabled || !started || nextOffset === null || !sentinel.current || busy || loadingLock.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingLock.current) return;
      loadingLock.current = true;
      setBusy(true);
      void getLilyRanking(RANKING_PAGE_SIZE, nextOffset).then((result) => {
        setRanking((current) => [...current, ...result.ranking]);
        setNextOffset(result.nextOffset);
        setError("");
      }).catch(() => setError(copy.rankingError)).finally(() => { setBusy(false); loadingLock.current = false; });
    }, { rootMargin: "240px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [busy, enabled, nextOffset, started]);

  if (!enabled) return null;
  return <aside className="landing-community" ref={column} aria-labelledby="landing-community-title">
    <header><span className="eyebrow">Pontos e conquistas</span><h2 id="landing-community-title">{copy.rankingTitle}</h2></header>
    {!started && <p className="landing-ranking-state">{copy.rankingLoading}</p>}
    {started && error && ranking.length === 0 && <p className="landing-ranking-state" role="status">{error}</p>}
    {started && ranking.length === 0 && !error && !busy && nextOffset === null && <p className="landing-ranking-state">{copy.rankingEmpty}</p>}
    {ranking.length > 0 && <ol className={`landing-ranking-list${nextOffset !== null ? " has-more" : ""}`}>{ranking.map((row) => <RankingRow key={row.userId} row={row} />)}</ol>}
    {busy && <p className="landing-ranking-state" role="status">{copy.rankingLoading}</p>}
    {error && ranking.length > 0 && <p className="landing-ranking-state" role="status">{error}</p>}
    {started && nextOffset !== null && <div className="landing-ranking-sentinel" ref={sentinel} aria-hidden="true" />}
    {started && <Link className="landing-ranking-more" to="/ranking">{copy.seeRanking}<span aria-hidden="true">→</span></Link>}
  </aside>;
}
