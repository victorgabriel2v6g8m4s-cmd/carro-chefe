import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getLilySession, parseResponse, type AuthPayload, type LilyBenefit } from "../../api";
import { LoyaltyBrandingEditor } from "./LoyaltyBrandingEditor";
import { LoyaltyLevelEditor } from "./LoyaltyLevelEditor";
import { readAdminApiError } from "./admin-api-error";
import { toLoyaltyLevelInput } from "./loyalty-level-payload";
import { loyaltyLevelThresholdError } from "./loyalty-level-validation";
import type { LoyaltyAdminPayload, LoyaltyLevel } from "./loyalty-types";

type Reward = LoyaltyAdminPayload["rewards"][number];
type Mission = LoyaltyAdminPayload["missions"][number];
type MissionDraft = { id: string; title: string; description: string; status: "draft" | "published" | "paused"; points: string; lilyCoins: string; prerequisites: string; audienceMode: "all" | "standard" | "vip" | "manual"; users: string; levels: string; instructions: string; rewards: string; actionUrl: string; approvalMode: "automatic" | "manual"; reviewHours: string; cadence: "daily" | "weekly" | "perpetual"; dailyLimit: string; weeklyLimit: string; monthlyLimit: string; showNextPeriod: boolean };
const emptyMissionDraft: MissionDraft = { id: "", title: "", description: "", status: "draft", points: "0", lilyCoins: "0", prerequisites: "", audienceMode: "all", users: "", levels: "", instructions: "[]", rewards: "[]", actionUrl: "", approvalMode: "automatic", reviewHours: "24", cadence: "perpetual", dailyLimit: "", weeklyLimit: "", monthlyLimit: "", showNextPeriod: false };
type BenefitRedemption = { id: string; levelName: string; benefitLabel: string; benefitKind: string; redemptionCode: string; status: string; createdAt: string; fulfilledAt: string | null };
const LoyaltyCurvePreview = lazy(() => import("./LoyaltyCurvePreview").then((module) => ({ default: module.LoyaltyCurvePreview })));

export function AdminLoyaltyPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<LoyaltyAdminPayload | null>(null);
  const [benefitRedemptions, setBenefitRedemptions] = useState<BenefitRedemption[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rewardDraft, setRewardDraft] = useState({ id: "", title: "", description: "", type: "coupon", lilyCoinCost: "100", couponId: "", productId: "", active: false });
  const [missionDraft, setMissionDraft] = useState<MissionDraft>(emptyMissionDraft);

  async function load() {
    const auth = session ?? await getLilySession();
    setSession(auth);
    const [result, claims] = await Promise.all([
      parseResponse<LoyaltyAdminPayload>(await fetch("/api/v1/lily/admin/loyalty", { credentials: "same-origin" })),
      parseResponse<{ redemptions: BenefitRedemption[] }>(await fetch("/api/v1/lily/admin/loyalty/benefit-redemptions", { credentials: "same-origin" }))
    ]);
    setData(result);
    setBenefitRedemptions(claims.redemptions);
  }

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar a fidelidade.")); }, []);
  const sortedLevels = useMemo(() => [...(data?.levels ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [data?.levels]);

  function updateLevel(levelId: string, patch: Partial<LoyaltyLevel>) {
    setData((current) => current ? { ...current, levels: current.levels.map((level) => level.id === levelId ? { ...level, ...patch } : level) } : current);
  }

  function moveLevel(index: number, offset: -1 | 1) {
    setData((current) => {
      if (!current) return current;
      const ordered = [...current.levels].sort((a, b) => a.sortOrder - b.sortOrder);
      const target = index + offset;
      if (target < 0 || target >= ordered.length) return current;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      return { ...current, levels: ordered.map((level, sortOrder) => ({ ...level, sortOrder })) };
    });
  }

  function addLevel() {
    setData((current) => current ? { ...current, levels: [...current.levels, {
      id: crypto.randomUUID(), name: "Novo nível", sortOrder: current.levels.length,
      requiredPoints: (current.levels.at(-1)?.requiredPoints ?? 0) + 100, lilyCoins: 0,
      benefits: [] as LilyBenefit[], iconMediaId: null, iconUrl: null, active: true
    }] } : current);
  }

  async function seed() {
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const draft = await parseResponse<{ levels: Array<Omit<LoyaltyLevel, "iconMediaId" | "iconUrl"> & { benefits: LilyBenefit[] }>; configVersion: number }>(await fetch("/api/v1/lily/admin/loyalty/levels/seed", {
        method: "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" }, body: "{}"
      }));
      setData((current) => current ? { ...current, levels: draft.levels.map((level) => ({ ...level, iconMediaId: null, iconUrl: null })), configVersion: draft.configVersion } : current);
      setMessage("Prévia inicial carregada como rascunho. Ajuste os limiares, os benefícios e as artes; nada muda para os clientes até salvar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar a sequência inicial."); }
    finally { setBusy(false); }
  }

  async function saveLevels() {
    if (!session || !data) return;
    const thresholdError = loyaltyLevelThresholdError(sortedLevels);
    if (thresholdError) { setError(thresholdError); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/lily/admin/loyalty/levels", {
        method: "PUT", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify({ levels: sortedLevels.map(toLoyaltyLevelInput), roundingMode: data.roundingMode })
      });
      if (!response.ok) throw await readAdminApiError(response);
      const result = await response.json() as { configVersion: number };
      await load();
      setMessage(`Níveis salvos na versão ${result.configVersion}. A curva recalcula o nível atual a partir dos pontos existentes.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar os níveis."); }
    finally { setBusy(false); }
  }

  async function saveReward(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await parseResponse(await fetch(rewardDraft.id ? `/api/v1/lily/admin/loyalty/rewards/${encodeURIComponent(rewardDraft.id)}` : "/api/v1/lily/admin/loyalty/rewards", {
        method: rewardDraft.id ? "PUT" : "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify({ title: rewardDraft.title, description: rewardDraft.description || null, type: rewardDraft.type, lilyCoinCost: Number(rewardDraft.lilyCoinCost), couponId: rewardDraft.type === "coupon" ? rewardDraft.couponId : null, productId: rewardDraft.type === "product" ? rewardDraft.productId : null, active: rewardDraft.active })
      }));
      setRewardDraft({ id: "", title: "", description: "", type: "coupon", lilyCoinCost: "100", couponId: "", productId: "", active: false });
      await load(); setMessage("Recompensa salva como rascunho inativo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a recompensa."); }
    finally { setBusy(false); }
  }

  function editReward(reward: Reward) {
    setRewardDraft({ id: reward.id, title: reward.title, description: reward.description ?? "", type: reward.type, lilyCoinCost: String(reward.lilyCoinCost), couponId: reward.couponId ?? "", productId: reward.productId ?? "", active: reward.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function rewardStatus(reward: Reward) {
    if (!session) return;
    setError(""); setMessage("");
    try {
      await parseResponse(await fetch(`/api/v1/lily/admin/loyalty/rewards/${encodeURIComponent(reward.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" }, body: JSON.stringify({ active: !reward.active }) }));
      await load(); setMessage(reward.active ? "Recompensa pausada." : "Recompensa ativada.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar a recompensa."); }
  }

  async function saveMission(mission: Mission, lilyCoins: number) {
    if (!session) return;
    try {
      await parseResponse(await fetch(`/api/v1/lily/admin/loyalty/missions/${encodeURIComponent(mission.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" }, body: JSON.stringify({ lilyCoins }) }));
      await load(); setMessage(`LilyCoins da missão “${mission.title}” atualizadas.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a missão."); throw cause; }
  }

  async function saveMissionDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const instructions = JSON.parse(missionDraft.instructions);
      const rewards = JSON.parse(missionDraft.rewards);
      const payload = {
        title: missionDraft.title, description: missionDraft.description || null, status: missionDraft.status,
        points: Number(missionDraft.points), lilyCoins: Number(missionDraft.lilyCoins),
        prerequisites: missionDraft.prerequisites.split(",").map((value) => value.trim()).filter(Boolean),
        instructions, rewards,
        audience: { mode: missionDraft.audienceMode, levels: missionDraft.levels.split(",").map((value) => value.trim()).filter(Boolean), users: missionDraft.users.split(",").map((value) => value.trim()).filter(Boolean) },
        actionUrl: missionDraft.actionUrl || null, approvalMode: missionDraft.approvalMode,
        reviewHours: Number(missionDraft.reviewHours), cadence: missionDraft.cadence,
        dailyLimit: missionDraft.dailyLimit ? Number(missionDraft.dailyLimit) : null,
        weeklyLimit: missionDraft.weeklyLimit ? Number(missionDraft.weeklyLimit) : null,
        monthlyLimit: missionDraft.monthlyLimit ? Number(missionDraft.monthlyLimit) : null,
        showNextPeriod: missionDraft.showNextPeriod
      };
      const url = missionDraft.id ? `/api/v1/lily/admin/loyalty/missions/${encodeURIComponent(missionDraft.id)}` : "/api/v1/lily/admin/loyalty/missions";
      await parseResponse(await fetch(url, { method: missionDraft.id ? "PATCH" : "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      setMissionDraft(emptyMissionDraft); await load(); setMessage("Missão salva. Se publicada, os usuários do público selecionado foram notificados.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revise os campos JSON e tente novamente."); }
    finally { setBusy(false); }
  }

  function editMission(mission: Mission) {
    const audience = JSON.parse(mission.audienceJson || "{\"mode\":\"all\",\"levels\":[],\"users\":[]}");
    setMissionDraft({
      ...emptyMissionDraft, id: mission.id, title: mission.title, description: mission.description ?? "", status: mission.status as MissionDraft["status"],
      points: String(mission.points), lilyCoins: String(mission.lilyCoins), prerequisites: (JSON.parse(mission.prerequisiteJson || "[]") as string[]).join(", "),
      audienceMode: audience.mode ?? "all", users: (audience.users ?? []).join(", "), levels: (audience.levels ?? []).join(", "), instructions: JSON.stringify(JSON.parse(mission.instructionsJson || "[]"), null, 2),
      rewards: JSON.stringify(JSON.parse(mission.rewardsJson || "[]"), null, 2), actionUrl: mission.actionUrl ?? "", approvalMode: mission.approvalMode as MissionDraft["approvalMode"],
      reviewHours: String(mission.reviewHours), cadence: mission.cadence as MissionDraft["cadence"], dailyLimit: mission.dailyLimit ? String(mission.dailyLimit) : "",
      weeklyLimit: mission.weeklyLimit ? String(mission.weeklyLimit) : "", monthlyLimit: mission.monthlyLimit ? String(mission.monthlyLimit) : "", showNextPeriod: mission.showNextPeriod
    });
    document.getElementById("mission-authoring")?.scrollIntoView({ behavior: "smooth" });
  }

  async function fulfillBenefitRedemption(redemption: BenefitRedemption) {
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await parseResponse(await fetch(`/api/v1/lily/admin/loyalty/benefit-redemptions/${encodeURIComponent(redemption.id)}/fulfill`, { method: "PATCH", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" }, body: "{}" }));
      await load(); setMessage(`Resgate ${redemption.redemptionCode} marcado como atendido.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir este resgate."); }
    finally { setBusy(false); }
  }

  return <section className="admin-page wide loyalty-admin">
    <div className="admin-heading"><div><span className="eyebrow">CookLily · fidelidade</span><h1>Níveis e LilyCoins</h1><p>Configure progressão, benefícios por nível e identidade da moeda.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Voltar ao painel</a></div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="state-live" role="status">{message}</p>}
    {data && session && <LoyaltyBrandingEditor initial={data.branding} session={session} onSaved={(branding) => setData((current) => current ? { ...current, branding } : current)} onError={setError} onMessage={setMessage} />}
    <section className="loyalty-admin-section">
      <div className="section-heading"><div><span className="eyebrow">Pontos acumulados definem o nível</span><h2>Curva de níveis</h2></div><button className="button ghost" type="button" onClick={() => void seed()} disabled={busy || Boolean(data?.levels.length)}>Adicionar sequência inicial</button></div>
      <label>Regra de arredondamento<select value={data?.roundingMode ?? "floor"} onChange={(event) => setData((current) => current ? { ...current, roundingMode: event.target.value as LoyaltyAdminPayload["roundingMode"] } : current)}><option value="floor">Arredondar para baixo</option><option value="nearest">Arredondar para o mais próximo</option><option value="ceil">Arredondar para cima</option></select></label>
      <div className="loyalty-level-table">{sortedLevels.map((level, index) => {
        const priorThreshold = sortedLevels[index - 1]?.requiredPoints ?? 0;
        const previousStep = index > 1 ? sortedLevels[index - 1].requiredPoints - sortedLevels[index - 2].requiredPoints : null;
        return <div className="loyalty-level-card-editor" key={level.id}>
          <LoyaltyLevelEditor level={level} index={index} priorThreshold={priorThreshold} previousStep={previousStep} csrfToken={session?.csrfToken ?? ""} catalog={data?.benefitCatalog ?? { categories: [], products: [], coupons: [], discounts: [], offers: [], combos: [], userClasses: [] }} onChange={(patch) => updateLevel(level.id, patch)} onError={setError} />
          <div className="level-order-controls"><button className="button ghost" type="button" aria-label={`Mover ${level.name} para cima`} disabled={busy || index === 0} onClick={() => moveLevel(index, -1)}>↑</button><button className="button ghost" type="button" aria-label={`Mover ${level.name} para baixo`} disabled={busy || index === sortedLevels.length - 1} onClick={() => moveLevel(index, 1)}>↓</button></div>
        </div>;
      })}</div>
      <div className="admin-actions"><button className="button ghost" type="button" onClick={addLevel}>Adicionar nível</button><button className="button primary" type="button" disabled={busy || !sortedLevels.length} onClick={() => void saveLevels()}>{busy ? "Salvando…" : "Salvar níveis"}</button></div>
      <p className="muted">Versão atual: {data?.configVersion ?? 0}. Salvar publica a curva e recalcula o nível a partir dos pontos atuais; LilyCoins já lançadas não são refeitas.</p>
      {data && <Suspense fallback={<p className="muted" role="status">Carregando prévia da curva…</p>}><LoyaltyCurvePreview levels={sortedLevels} /></Suspense>}
    </section>
    <section className="loyalty-admin-section"><span className="eyebrow">Trocas do catálogo</span><h2>{rewardDraft.id ? "Editar recompensa" : "Recompensas"}</h2>
      <form className="admin-form-grid" onSubmit={(event) => void saveReward(event)}>
        <label>Título<input required value={rewardDraft.title} onChange={(event) => setRewardDraft({ ...rewardDraft, title: event.target.value })} /></label>
        <label>Descrição<input value={rewardDraft.description} onChange={(event) => setRewardDraft({ ...rewardDraft, description: event.target.value })} /></label>
        <label>Tipo<select value={rewardDraft.type} onChange={(event) => setRewardDraft({ ...rewardDraft, type: event.target.value })}><option value="coupon">Cupom</option><option value="product">Produto</option></select></label>
        <label>Custo em {data?.branding.coinName ?? "LilyCoins"}<input type="number" min="1" value={rewardDraft.lilyCoinCost} onChange={(event) => setRewardDraft({ ...rewardDraft, lilyCoinCost: event.target.value })} /></label>
        {rewardDraft.type === "coupon" ? <label>Cupom base<select value={rewardDraft.couponId} onChange={(event) => setRewardDraft({ ...rewardDraft, couponId: event.target.value })} required={!rewardDraft.id}><option value="">Selecione um cupom</option>{data?.coupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.title} · {coupon.code}</option>)}</select></label> : <label>Produto<select value={rewardDraft.productId} onChange={(event) => setRewardDraft({ ...rewardDraft, productId: event.target.value })} required={!rewardDraft.id}><option value="">Selecione um produto</option>{data?.products.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}</select></label>}
        <button className="button primary" disabled={busy}>{rewardDraft.id ? "Salvar edição" : "Criar como rascunho"}</button>{rewardDraft.id && <button type="button" className="button ghost" onClick={() => setRewardDraft({ id: "", title: "", description: "", type: "coupon", lilyCoinCost: "100", couponId: "", productId: "", active: false })}>Cancelar edição</button>}
      </form>
      <div className="loyalty-reward-grid">{data?.rewards.map((reward) => <article className="loyalty-reward-card" key={reward.id}><h3>{reward.title}</h3><p>{reward.lilyCoinCost.toLocaleString("pt-BR")} {data.branding.coinName} · {reward.type}</p><button className="button ghost" type="button" onClick={() => editReward(reward)}>Editar</button><button className="button ghost" type="button" onClick={() => void rewardStatus(reward)}>{reward.active ? "Pausar" : "Ativar"}</button></article>)}</div>
    </section>
    <section className="loyalty-admin-section" id="mission-authoring"><span className="eyebrow">Criar e gerir missões</span><h2>{missionDraft.id ? "Editar missão" : "Nova missão"}</h2>
      <form className="admin-form-grid" onSubmit={(event) => void saveMissionDraft(event)}>
        <label>Título<input required maxLength={120} value={missionDraft.title} onChange={(event) => setMissionDraft({ ...missionDraft, title: event.target.value })} /></label>
        <label>Descrição<textarea maxLength={1000} value={missionDraft.description} onChange={(event) => setMissionDraft({ ...missionDraft, description: event.target.value })} /></label>
        <label>Status<select value={missionDraft.status} onChange={(event) => setMissionDraft({ ...missionDraft, status: event.target.value as MissionDraft["status"] })}><option value="draft">Rascunho</option><option value="published">Publicada</option><option value="paused">Pausada</option></select></label>
        <label>Pontos<input type="number" min="0" value={missionDraft.points} onChange={(event) => setMissionDraft({ ...missionDraft, points: event.target.value })} /></label>
        <label>{data?.branding.coinName ?? "LilyCoins"}<input type="number" min="0" value={missionDraft.lilyCoins} onChange={(event) => setMissionDraft({ ...missionDraft, lilyCoins: event.target.value })} /></label>
        <label>Público<select value={missionDraft.audienceMode} onChange={(event) => setMissionDraft({ ...missionDraft, audienceMode: event.target.value as MissionDraft["audienceMode"] })}><option value="all">Todos</option><option value="standard">Padrão</option><option value="vip">VIP</option><option value="manual">Contas selecionadas</option></select></label>
        {missionDraft.audienceMode === "manual" && <label>IDs de usuários, separados por vírgula<input value={missionDraft.users} onChange={(event) => setMissionDraft({ ...missionDraft, users: event.target.value })} /></label>}
        <label>Níveis permitidos (IDs separados por vírgula)<input value={missionDraft.levels} onChange={(event) => setMissionDraft({ ...missionDraft, levels: event.target.value })} /></label>
        <label>Missões pré-requisito (IDs separados por vírgula)<input value={missionDraft.prerequisites} onChange={(event) => setMissionDraft({ ...missionDraft, prerequisites: event.target.value })} /></label>
        <label>Link de ação<input type="url" value={missionDraft.actionUrl} onChange={(event) => setMissionDraft({ ...missionDraft, actionUrl: event.target.value })} placeholder="https://licalily.com/cook/..." /></label>
        <label>Aprovação<select value={missionDraft.approvalMode} onChange={(event) => setMissionDraft({ ...missionDraft, approvalMode: event.target.value as MissionDraft["approvalMode"] })}><option value="automatic">Automática</option><option value="manual">Manual pela equipe</option></select></label>
        <label>Prazo de análise (horas)<input type="number" min="1" max="720" value={missionDraft.reviewHours} onChange={(event) => setMissionDraft({ ...missionDraft, reviewHours: event.target.value })} /></label>
        <label>Periodicidade<select value={missionDraft.cadence} onChange={(event) => setMissionDraft({ ...missionDraft, cadence: event.target.value as MissionDraft["cadence"] })}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="perpetual">Perpétua</option></select></label>
        <label>Limite diário<input type="number" min="1" value={missionDraft.dailyLimit} onChange={(event) => setMissionDraft({ ...missionDraft, dailyLimit: event.target.value })} /></label>
        <label>Limite semanal<input type="number" min="1" value={missionDraft.weeklyLimit} onChange={(event) => setMissionDraft({ ...missionDraft, weeklyLimit: event.target.value })} /></label>
        <label>Limite mensal<input type="number" min="1" value={missionDraft.monthlyLimit} onChange={(event) => setMissionDraft({ ...missionDraft, monthlyLimit: event.target.value })} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={missionDraft.showNextPeriod} onChange={(event) => setMissionDraft({ ...missionDraft, showNextPeriod: event.target.checked })} /> Mostrar missões do próximo período</label>
        <label>Etapas (JSON: título, instruções, obrigatório, mediaId)<textarea rows={5} value={missionDraft.instructions} onChange={(event) => setMissionDraft({ ...missionDraft, instructions: event.target.value })} /></label>
        <label>Recompensas adicionais (JSON: kind, id, quantity)<textarea rows={4} value={missionDraft.rewards} onChange={(event) => setMissionDraft({ ...missionDraft, rewards: event.target.value })} /></label>
        <button className="button primary" disabled={busy}>{busy ? "Salvando…" : missionDraft.id ? "Salvar edição" : "Criar missão"}</button>{missionDraft.id && <button className="button ghost" type="button" onClick={() => setMissionDraft(emptyMissionDraft)}>Cancelar edição</button>}
      </form>
      <div className="loyalty-reward-grid">{data?.missions.map((mission) => <article className="loyalty-reward-card" key={mission.id}><span>{mission.status}</span><h3>{mission.title}</h3><p>{mission.points} pontos · {mission.lilyCoins} {data.branding.coinName}</p><button className="button ghost" type="button" onClick={() => editMission(mission)}>Editar missão</button></article>)}</div>
    </section>
    <section className="loyalty-admin-section"><span className="eyebrow">Atendimento dos benefícios</span><h2>Resgates dos clientes</h2><div className="loyalty-admin-redemptions">{benefitRedemptions.map((redemption) => <article key={redemption.id}><span><strong>{redemption.benefitLabel}</strong><small>{redemption.levelName} · {new Date(redemption.createdAt).toLocaleString("pt-BR")}</small></span><code>{redemption.redemptionCode}</code><strong>{redemption.status === "fulfilled" ? "Atendido" : "Pendente"}</strong>{redemption.status === "claimed" && <button className="button ghost" type="button" disabled={busy} onClick={() => void fulfillBenefitRedemption(redemption)}>Marcar atendido</button>}</article>)}</div>{!benefitRedemptions.length && <p>Nenhum cliente resgatou benefícios ainda.</p>}</section>
  </section>;
}

function MissionCoinEditor({ mission, coinName, onSave }: { mission: Mission; coinName: string; onSave: (mission: Mission, coins: number) => Promise<void> }) {
  const [coins, setCoins] = useState(String(mission.lilyCoins));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return <form className="loyalty-mission-row" onSubmit={(event) => { event.preventDefault(); setBusy(true); void onSave(mission, Number(coins)).then(() => setSaved(true)).finally(() => setBusy(false)); }}><span><strong>{mission.title}</strong><small>{mission.points.toLocaleString("pt-BR")} pontos</small></span><label>{coinName}<input type="number" min="0" value={coins} onChange={(event) => { setCoins(event.target.value); setSaved(false); }} /></label><button className="button ghost" disabled={busy}>{busy ? "Salvando…" : saved ? "Salvo" : "Salvar"}</button></form>;
}
