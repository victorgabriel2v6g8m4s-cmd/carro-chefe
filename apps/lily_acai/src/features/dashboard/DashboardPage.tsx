import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { claimLilyMission, getLilySession, getLilyLoyalty, getLilyProfile, redeemLilyReward, type AuthPayload, type LilyLoyaltyPayload, type LilyProfilePayload } from "../../api";
import { getCustomerOrders } from "../orders/api";
import { surveyJson } from "../surveys/api";

type Mission = { id: string; title: string; description: string | null; points: number; lilyCoins: number; claimed: boolean };
type Order = { id: string; orderNumber: string; status: string; grandTotalCents: number; createdAt?: string };
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function DashboardPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [profile, setProfile] = useState<LilyProfilePayload | null>(null);
  const [loyalty, setLoyalty] = useState<LilyLoyaltyPayload | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busyReward, setBusyReward] = useState("");
  const [busyMission, setBusyMission] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.allSettled([getLilyProfile(), getLilyLoyalty(), surveyJson<{ missions: Mission[] }>("missions"), getCustomerOrders(), getLilySession()])
      .then(([profileResult, loyaltyResult, missionResult, orderResult, sessionResult]) => {
        if (!active) return;
        if (profileResult.status === "fulfilled") setProfile(profileResult.value);
        if (loyaltyResult.status === "fulfilled") setLoyalty(loyaltyResult.value);
        if (missionResult.status === "fulfilled") setMissions(missionResult.value.missions);
        if (orderResult.status === "fulfilled") setOrders(orderResult.value.orders.slice(0, 8));
        if (sessionResult.status === "fulfilled") setSession(sessionResult.value);
        const failed = [profileResult, loyaltyResult, missionResult, orderResult].some((result) => result.status === "rejected");
        if (failed) setError("Algumas informações do dashboard não puderam ser carregadas. Atualize a página para tentar novamente.");
      });
    return () => { active = false; };
  }, []);

  async function claim(rewardId: string) {
    if (!session?.csrfToken) { setError("Atualize sua sessão para reivindicar a recompensa."); return; }
    setBusyReward(rewardId); setError("");
    try { const result = await redeemLilyReward(rewardId, session.csrfToken); setLoyalty(result.loyalty); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reivindicar agora."); }
    finally { setBusyReward(""); }
  }

  async function claimMission(missionId: string) {
    if (!session?.csrfToken) { setError("Atualize sua sessão para reivindicar a missão."); return; }
    setBusyMission(missionId); setError("");
    try { const result = await claimLilyMission(missionId, session.csrfToken); setLoyalty(result.loyalty); setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, claimed: true } : mission)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reivindicar a missão."); }
    finally { setBusyMission(""); }
  }

  return <section className="loyalty-dashboard">
    <header className="loyalty-dashboard-heading"><span className="eyebrow">CookLily · fidelidade</span><h1>Seu espaço CookLily</h1><p>Acompanhe seu progresso, LilyCoins, recompensas e pedidos.</p></header>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="loyalty-overview" aria-label="Progresso e saldo">
      <article className="loyalty-level-card"><span>Nível atual</span><h2>{loyalty?.currentLevel?.name ?? "Sua jornada começa aqui"}</h2><strong>{(loyalty?.points ?? profile?.loyalty.points ?? 0).toLocaleString("pt-BR")} pontos</strong>
        {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel) ? <><p>Próximo: {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel)!.name} · {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel)!.requiredPoints.toLocaleString("pt-BR")} pontos</p><progress max="100" value={loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0} aria-label={`${loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0}% do progresso para o próximo nível`} /><small>{loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0}% para o próximo nível</small></> : <p>Continue participando para avançar nos níveis.</p>}
        {!!loyalty?.currentLevel?.benefits.length && <ul>{loyalty.currentLevel.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>}
      </article>
      <article className="lilycoin-card"><span>Seu saldo acumulado</span><strong className="lilycoin-total">{(loyalty?.lilyCoins ?? profile?.loyalty.lilyCoins ?? 0).toLocaleString("pt-BR")} LilyCoins</strong><div className="lilycoin-track"><span style={{ width: `${Math.min(100, loyalty?.nextRewardTarget ? Math.max(0, (loyalty.lilyCoins / loyalty.nextRewardTarget.lilyCoinCost) * 100) : 0)}%` }} /></div><small>{loyalty?.nextRewardTarget ? `${Math.max(0, loyalty.nextRewardTarget.lilyCoinCost - loyalty.lilyCoins).toLocaleString("pt-BR")} LilyCoins para ${loyalty.nextRewardTarget.title}` : "As recompensas aparecerão aqui quando estiverem disponíveis."}</small><p>Você escolhe: reivindicar uma recompensa ou continuar acumulando.</p></article>
    </section>
    <section className="loyalty-section"><div className="section-heading"><div><span className="eyebrow">Troque ou acumule</span><h2>Recompensas</h2></div></div><div className="loyalty-reward-grid">{loyalty?.rewards.map((reward) => <article className="loyalty-reward-card" key={reward.id}><h3>{reward.title}</h3>{reward.description && <p>{reward.description}</p>}<strong>{reward.lilyCoinCost.toLocaleString("pt-BR")} LilyCoins</strong><button className="button primary" type="button" disabled={!reward.canRedeem || Boolean(busyReward)} onClick={() => void claim(reward.id)}>{busyReward === reward.id ? "Reivindicando…" : reward.canRedeem ? "Reivindicar" : "Continuar acumulando"}</button></article>)}</div>{!loyalty?.rewards.length && <p>Nenhuma recompensa disponível no momento.</p>}</section>
    <section className="loyalty-section"><div className="section-heading"><div><span className="eyebrow">Continue avançando</span><h2>Missões disponíveis</h2></div><Link to="/pesquisas">Ver pesquisas</Link></div><div className="loyalty-reward-grid">{missions.map((mission) => <article className="loyalty-reward-card" key={mission.id}><h3>{mission.title}</h3>{mission.description && <p>{mission.description}</p>}<strong>{mission.points.toLocaleString("pt-BR")} pontos{mission.lilyCoins ? ` · ${mission.lilyCoins.toLocaleString("pt-BR")} LilyCoins` : ""}</strong><button className="button primary" type="button" disabled={mission.claimed || Boolean(busyMission)} onClick={() => void claimMission(mission.id)}>{busyMission === mission.id ? "Reivindicando…" : mission.claimed ? "Missão concluída" : "Reivindicar missão"}</button></article>)}</div>{!missions.length && <p>Novas missões aparecerão quando forem liberadas para você.</p>}</section>
    <section className="loyalty-section"><div className="section-heading"><div><span className="eyebrow">Seus pedidos</span><h2>Pedidos recentes</h2></div><Link to="/pedidos">Ver todos</Link></div><div className="order-history-carousel">{orders.map((order) => <article key={order.id}><strong>Pedido {order.orderNumber}</strong><span>{order.status}</span><small>{currency(order.grandTotalCents)}</small><Link className="button ghost" to={`/pedidos/${encodeURIComponent(order.id)}`}>Acompanhar</Link></article>)}</div>{!orders.length && <p>Seus pedidos aparecerão aqui quando você fizer o primeiro.</p>}</section>
    <nav className="loyalty-shortcuts" aria-label="Atalhos"><Link className="button primary" to="/pesquisas">Responder pesquisas</Link><Link className="button ghost" to="/ranking">Ranking</Link><Link className="button ghost" to="/perfil">Meu perfil</Link></nav>
  </section>;
}
