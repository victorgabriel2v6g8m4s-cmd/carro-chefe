import { useEffect, useState } from "react";
import { Link } from "../../router";
import { claimLilyMission, getLilyAuthStatus, getLilySession, getLilyLoyalty, getLilyProfile, redeemLilyReward, redeemLilyLevelBenefit, type AuthPayload, type LilyLoyaltyPayload, type LilyProfilePayload } from "../../api";
import { getCustomerOrders } from "../orders/api";
import { surveyJson } from "../surveys/api";
import { CustomerStatsPanel } from "../loyalty/CustomerStatsPanel";

type Mission = { id: string; title: string; description: string | null; points: number; lilyCoins: number; claimed: boolean };
type Order = { id: string; orderNumber: string; status: string; grandTotalCents: number; createdAt?: string };
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function DashboardPage() {
  const [access, setAccess] = useState<"checking" | "anonymous" | "authenticated" | "unavailable">("checking");
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [profile, setProfile] = useState<LilyProfilePayload | null>(null);
  const [loyalty, setLoyalty] = useState<LilyLoyaltyPayload | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busyReward, setBusyReward] = useState("");
  const [busyMission, setBusyMission] = useState("");
  const [busyBenefit, setBusyBenefit] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const auth = await getLilyAuthStatus();
        if (!active) return;
        if (!auth.user) { setAccess("anonymous"); return; }
        setAccess("authenticated");
      } catch {
        if (active) {
          setAccess("unavailable");
          setError("Não foi possível verificar seu acesso agora. Tente novamente.");
        }
        return;
      }

      const [profileResult, loyaltyResult, missionResult, orderResult, sessionResult] = await Promise.allSettled([
        getLilyProfile(), getLilyLoyalty(), surveyJson<{ missions: Mission[] }>("missions"), getCustomerOrders(), getLilySession()
      ]);
      if (!active) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (loyaltyResult.status === "fulfilled") setLoyalty(loyaltyResult.value);
      if (missionResult.status === "fulfilled") setMissions(missionResult.value.missions);
      if (orderResult.status === "fulfilled") setOrders(orderResult.value.orders.slice(0, 8));
      if (sessionResult.status === "fulfilled") setSession(sessionResult.value);
      const failed = [profileResult, loyaltyResult, missionResult, orderResult].some((result) => result.status === "rejected");
      if (failed) setError("Algumas informações do dashboard não puderam ser carregadas. Atualize a página para tentar novamente.");
    }
    void loadDashboard();
    return () => { active = false; };
  }, []);

  async function claim(rewardId: string) {
    if (!session?.csrfToken) { setError("Atualize sua sessão para reivindicar a recompensa."); return; }
    setBusyReward(rewardId); setError("");
    try { const result = await redeemLilyReward(rewardId, session.csrfToken); setLoyalty(result.loyalty); window.dispatchEvent(new Event("cooklily:loyalty-updated")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reivindicar agora."); }
    finally { setBusyReward(""); }
  }

  async function claimMission(missionId: string) {
    if (!session?.csrfToken) { setError("Atualize sua sessão para reivindicar a missão."); return; }
    setBusyMission(missionId); setError("");
    try { const result = await claimLilyMission(missionId, session.csrfToken); setLoyalty(result.loyalty); window.dispatchEvent(new Event("cooklily:loyalty-updated")); setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, claimed: true } : mission)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reivindicar a missão."); }
    finally { setBusyMission(""); }
  }

  async function claimBenefit(levelId: string, benefitId: string) {
    if (!session?.csrfToken) { setError("Atualize sua sessão para resgatar o benefício."); return; }
    const busyKey = `${levelId}:${benefitId}`;
    setBusyBenefit(busyKey); setError("");
    try { const result = await redeemLilyLevelBenefit(levelId, benefitId, session.csrfToken); setLoyalty(result.loyalty); window.dispatchEvent(new Event("cooklily:loyalty-updated")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível resgatar este benefício."); }
    finally { setBusyBenefit(""); }
  }

  if (access === "checking") return <section className="loyalty-dashboard loyalty-dashboard-access" aria-live="polite"><p>Verificando seu acesso ao dashboard…</p></section>;

  if (access === "anonymous") return <section className="loyalty-dashboard">
    <header className="loyalty-dashboard-heading"><span className="eyebrow">CookLily · fidelidade</span><h1>Seu espaço CookLily</h1><p>Acompanhe pontos, LilyCoins, recompensas e pedidos em um só lugar.</p></header>
    <section className="loyalty-dashboard-auth-gate survey-state survey-auth-gate" aria-labelledby="loyalty-dashboard-auth-title">
      <span className="eyebrow">Seu progresso</span>
      <h2 id="loyalty-dashboard-auth-title">Faça login ou crie uma conta para monitorar seu desempenho</h2>
      <p>Depois de entrar, você poderá acompanhar seus pontos, níveis, LilyCoins, missões e recompensas.</p>
      <div className="loyalty-dashboard-auth-actions">
        <Link className="button primary" to="/entrar?next=%2Fdashboard">Fazer login</Link>
        <Link className="button ghost" to="/cadastro?next=%2Fdashboard">Criar conta</Link>
      </div>
    </section>
  </section>;

  if (access === "unavailable") return <section className="loyalty-dashboard loyalty-dashboard-access"><p className="error" role="alert">{error}</p><button className="button primary" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section>;

  return <section className="loyalty-dashboard">
    <header className="loyalty-dashboard-heading"><span className="eyebrow">CookLily · fidelidade</span><h1>Seu espaço CookLily</h1><p>Acompanhe seu progresso, LilyCoins, recompensas e pedidos.</p></header>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="loyalty-overview" aria-label="Progresso e saldo">
      <Link className="loyalty-level-card" to="/niveis" aria-label="Ver todos os níveis e recompensas"><span>Nível atual · ver todos</span>{loyalty?.currentLevel?.iconUrl && <img className="loyalty-level-icon" src={loyalty.currentLevel.iconUrl} alt="" />}<h2>{loyalty?.currentLevel?.name ?? "Sua jornada começa aqui"}</h2><strong>{(loyalty?.points ?? profile?.loyalty.points ?? 0).toLocaleString("pt-BR")} pontos</strong>
        {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel) ? <><p>Próximo: {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel)!.name} · {(loyalty?.nextLevel ?? profile?.loyalty.nextLevel)!.requiredPoints.toLocaleString("pt-BR")} pontos</p><progress max="100" value={loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0} aria-label={`${loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0}% do progresso para o próximo nível`} /><small>{loyalty?.levelProgressPercent ?? profile?.loyalty.levelProgressPercent ?? 0}% para o próximo nível</small></> : <p>Continue participando para avançar nos níveis.</p>}
      </Link>
      <article className="lilycoin-card"><span>Seu saldo acumulado</span><strong className="lilycoin-total">{loyalty?.coinIconUrl && <img src={loyalty.coinIconUrl} alt="" />}{(loyalty?.lilyCoins ?? profile?.loyalty.lilyCoins ?? 0).toLocaleString("pt-BR")} {loyalty?.coinName ?? profile?.loyalty.coinName ?? "LilyCoins"}</strong><div className="lilycoin-track"><span style={{ width: `${Math.min(100, loyalty?.nextRewardTarget ? Math.max(0, (loyalty.lilyCoins / loyalty.nextRewardTarget.lilyCoinCost) * 100) : 0)}%` }} /></div><small>{loyalty?.nextRewardTarget ? `${Math.max(0, loyalty.nextRewardTarget.lilyCoinCost - loyalty.lilyCoins).toLocaleString("pt-BR")} ${loyalty.coinName} para ${loyalty.nextRewardTarget.title}` : "As recompensas aparecerão aqui quando estiverem disponíveis."}</small><p>Você escolhe: reivindicar uma recompensa ou continuar acumulando.</p></article>
    </section>
    <CustomerStatsPanel compact />
    <section className="loyalty-section loyalty-benefit-redemption-section"><div className="section-heading"><div><span className="eyebrow">Benefícios dos níveis alcançados</span><h2>Disponíveis para resgate</h2><p>Os limites são por benefício e por cliente. Cupons resgatados ficam vinculados à sua conta; para produtos, combos e outros benefícios, mostre o código à equipe.</p></div></div>
      <div className="loyalty-benefit-redemption-grid">{loyalty?.unlockedLevels.flatMap((level) => level.benefits.map((benefit) => <article className="loyalty-benefit-redemption-card" key={`${level.id}:${benefit.id}`}><span className="eyebrow">{level.name}</span><h3>{benefit.label}</h3><p>{benefit.selectionMode === "preset" ? "A combinação foi definida pela CookLily." : "As opções serão definidas com a equipe no atendimento."}</p><small>{benefit.remainingRedemptions} de {benefit.maxRedemptionsPerUser} resgate(s) disponíveis para você</small>{benefit.canRedeem ? <button className="button primary" type="button" disabled={Boolean(busyBenefit)} onClick={() => void claimBenefit(level.id, benefit.id)}>{busyBenefit === `${level.id}:${benefit.id}` ? "Gerando resgate…" : "Resgatar benefício"}</button> : <strong className="loyalty-benefit-limit-reached">Limite utilizado</strong>}{benefit.redemptions.map((redemption) => <div className="loyalty-redemption-code" key={redemption.id}><span>{redemption.status === "fulfilled" ? "Atendido" : "Código para apresentar"}</span><strong>{redemption.redemptionCode}</strong></div>)}</article>))}</div>{!loyalty?.unlockedLevels.some((level) => level.benefits.length) && <p>Os benefícios aparecem aqui quando você alcançar um nível que tenha benefícios configurados.</p>}
    </section>
    <section className="loyalty-section"><div className="section-heading"><div><span className="eyebrow">Troque ou acumule</span><h2>Recompensas</h2></div></div><div className="loyalty-reward-grid">{loyalty?.rewards.map((reward) => <article className="loyalty-reward-card" key={reward.id}><h3>{reward.title}</h3>{reward.description && <p>{reward.description}</p>}<strong>{reward.lilyCoinCost.toLocaleString("pt-BR")} LilyCoins</strong><button className="button primary" type="button" disabled={!reward.canRedeem || Boolean(busyReward)} onClick={() => void claim(reward.id)}>{busyReward === reward.id ? "Reivindicando…" : reward.canRedeem ? "Reivindicar" : "Continuar acumulando"}</button></article>)}</div>{!loyalty?.rewards.length && <p>Nenhuma recompensa disponível no momento.</p>}</section>
    <section className="loyalty-section" id="missions"><div className="section-heading"><div><span className="eyebrow">Continue avançando</span><h2>Missões disponíveis</h2></div><Link to="/pesquisas">Ver pesquisas</Link></div><div className="loyalty-reward-grid">{missions.map((mission) => <article className="loyalty-reward-card" key={mission.id}><h3>{mission.title}</h3>{mission.description && <p>{mission.description}</p>}<strong>{mission.points.toLocaleString("pt-BR")} pontos{mission.lilyCoins ? ` · ${mission.lilyCoins.toLocaleString("pt-BR")} LilyCoins` : ""}</strong><button className="button primary" type="button" disabled={mission.claimed || Boolean(busyMission)} onClick={() => void claimMission(mission.id)}>{busyMission === mission.id ? "Reivindicando…" : mission.claimed ? "Missão concluída" : "Reivindicar missão"}</button></article>)}</div>{!missions.length && <p>Novas missões aparecerão quando forem liberadas para você.</p>}</section>
    <section className="loyalty-section"><div className="section-heading"><div><span className="eyebrow">Seus pedidos</span><h2>Pedidos recentes</h2></div><Link to="/pedidos">Ver todos</Link></div><div className="order-history-carousel">{orders.map((order) => <article key={order.id}><strong>Pedido {order.orderNumber}</strong><span>{order.status}</span><small>{currency(order.grandTotalCents)}</small><Link className="button ghost" to={`/pedidos/${encodeURIComponent(order.id)}`}>Acompanhar</Link></article>)}</div>{!orders.length && <p>Seus pedidos aparecerão aqui quando você fizer o primeiro.</p>}</section>
    <nav className="loyalty-shortcuts" aria-label="Atalhos"><Link className="button primary" to="/pesquisas">Responder pesquisas</Link><Link className="button ghost" to="/ranking">Ranking</Link><Link className="button ghost" to="/perfil">Meu perfil</Link></nav>
  </section>;
}
