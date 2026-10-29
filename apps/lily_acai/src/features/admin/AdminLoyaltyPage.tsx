import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getLilySession, parseResponse, type AuthPayload, type LilyBenefit } from "../../api";
import { LoyaltyBrandingEditor } from "./LoyaltyBrandingEditor";
import { LoyaltyLevelEditor } from "./LoyaltyLevelEditor";
import type { LoyaltyAdminPayload, LoyaltyLevel } from "./loyalty-types";

type Reward = LoyaltyAdminPayload["rewards"][number];
type Mission = LoyaltyAdminPayload["missions"][number];
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
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await parseResponse<{ configVersion: number }>(await fetch("/api/v1/lily/admin/loyalty/levels", {
        method: "PUT", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify({ levels: sortedLevels.map(({ iconUrl: _iconUrl, ...level }, sortOrder) => ({ ...level, sortOrder })), roundingMode: data.roundingMode })
      }));
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
    <section className="loyalty-admin-section"><span className="eyebrow">Configuração simples das missões existentes</span><h2>{data?.branding.coinName ?? "LilyCoins"} por missão</h2>{data?.missions.map((mission) => <MissionCoinEditor key={mission.id} mission={mission} coinName={data.branding.coinName} onSave={saveMission} />)}{!data?.missions.length && <p>Não há missões cadastradas. Esta tela não cria missões.</p>}</section>
    <section className="loyalty-admin-section"><span className="eyebrow">Atendimento dos benefícios</span><h2>Resgates dos clientes</h2><div className="loyalty-admin-redemptions">{benefitRedemptions.map((redemption) => <article key={redemption.id}><span><strong>{redemption.benefitLabel}</strong><small>{redemption.levelName} · {new Date(redemption.createdAt).toLocaleString("pt-BR")}</small></span><code>{redemption.redemptionCode}</code><strong>{redemption.status === "fulfilled" ? "Atendido" : "Pendente"}</strong>{redemption.status === "claimed" && <button className="button ghost" type="button" disabled={busy} onClick={() => void fulfillBenefitRedemption(redemption)}>Marcar atendido</button>}</article>)}</div>{!benefitRedemptions.length && <p>Nenhum cliente resgatou benefícios ainda.</p>}</section>
  </section>;
}

function MissionCoinEditor({ mission, coinName, onSave }: { mission: Mission; coinName: string; onSave: (mission: Mission, coins: number) => Promise<void> }) {
  const [coins, setCoins] = useState(String(mission.lilyCoins));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return <form className="loyalty-mission-row" onSubmit={(event) => { event.preventDefault(); setBusy(true); void onSave(mission, Number(coins)).then(() => setSaved(true)).finally(() => setBusy(false)); }}><span><strong>{mission.title}</strong><small>{mission.points.toLocaleString("pt-BR")} pontos</small></span><label>{coinName}<input type="number" min="0" value={coins} onChange={(event) => { setCoins(event.target.value); setSaved(false); }} /></label><button className="button ghost" disabled={busy}>{busy ? "Salvando…" : saved ? "Salvo" : "Salvar"}</button></form>;
}
