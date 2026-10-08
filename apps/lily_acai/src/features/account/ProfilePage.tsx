import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  changeLilyPassword,
  confirmLilyMfaSetup,
  getLilyMfaStatus,
  getLilyProfile,
  getLilyRanking,
  getLilySession,
  getLilySessions,
  logoutLily,
  revokeOtherLilySessions,
  startLilyMfaSetup,
  updateLilyProfile,
  uploadLilyProfileAvatar,
  verifyLilyMfa,
  type AuthPayload,
  type LilyMfaStatus,
  type LilyProfilePayload,
  type LilyRankingRow,
  type LilySessionRow
} from "../../api";
import { formatBrazilianPhone } from "./phone-format";
import { openImageCropper } from "../../image-crop-editor";
import { LilyLoadingSpinner } from "../../loading-spinner";

function ProfileAvatar({ name, url, large = false }: { name: string | null; url: string | null; large?: boolean }) {
  const initial = (name?.trim()[0] || "C").toUpperCase();
  return <span className={large ? "profile-avatar large" : "profile-avatar"}>
    {url ? <img src={url} alt={name ? `Foto de perfil de ${name}` : "Foto de perfil"} /> : <span aria-hidden="true">{initial}</span>}
  </span>;
}

function AccountRequired() {
  return <section className="checkout-page empty-state">
    <span className="eyebrow">Conta CookLily</span>
    <h1>Entre para editar seu perfil.</h1>
    <p>Sua conta mantém perfil, endereços, pedidos e pontos CookLily.</p>
    <div className="account-cta-row">
      <Link className="button primary" to="/entrar">Entrar</Link>
      <Link className="button ghost" to="/cadastro">Criar conta</Link>
    </div>
  </section>;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [profile, setProfile] = useState<LilyProfilePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<LilyMfaStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<LilySessionRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarTriggerRef = useRef<HTMLButtonElement>(null);
  const avatarCloseRef = useRef<HTMLButtonElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAvatarPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    avatarCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      avatarTriggerRef.current?.focus();
    };
  }, [avatarPreviewOpen]);

  async function refresh() {
    const current = await getLilySession();
    setSession(current);
    const [nextProfile, sessionPayload] = await Promise.all([getLilyProfile(), getLilySessions()]);
    setProfile(nextProfile);
    setSessions(sessionPayload.sessions);
    if (["staff", "courier", "admin"].includes(current.user.role)) {
      setMfaStatus(await getLilyMfaStatus());
    } else {
      setMfaStatus(null);
    }
  }

  useEffect(() => {
    refresh().catch(() => {
      setSession(null);
      setProfile(null);
    }).finally(() => setLoaded(true));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !profile) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateLilyProfile({
        displayName: String(data.get("displayName") || "") || null,
        rankingOptIn: data.get("rankingOptIn") === "on"
      }, session.csrfToken);
      setProfile(updated);
      setSession((current) => current ? {
        ...current,
        user: {
          ...current.user,
          displayName: updated.user.displayName,
          rankingOptIn: updated.user.rankingOptIn,
          avatarUrl: updated.user.avatarUrl
        }
      } : current);
      setMessage("Perfil atualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o perfil.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!session || !file.size) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await uploadLilyProfileAvatar(file, session.csrfToken);
      setProfile(updated);
      setSession((current) => current ? {
        ...current,
        user: { ...current.user, avatarUrl: updated.user.avatarUrl }
      } : current);
      window.dispatchEvent(new CustomEvent("cooklily:profile-updated"));
      setMessage("Foto de perfil atualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const cropped = await openImageCropper(file, {
        aspectRatio: 1,
        title: "Ajustar foto de perfil",
        description: "Mova a foto e aproxime até deixar o rosto bem enquadrado dentro do círculo. A imagem salva será somente o recorte.",
        maxOutputBytes: 5 * 1024 * 1024,
        maxLongEdge: 1200
      });
      if (cropped) await uploadAvatar(cropped);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a foto.");
    }
  }

  function focusProfileEditor() {
    editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => displayNameInputRef.current?.focus(), 150);
  }

  async function handleLogout() {
    if (!session || logoutBusy) return;
    setLogoutBusy(true);
    setError("");
    try {
      await logoutLily(session.csrfToken);
      navigate("/cardapio", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível sair da conta.");
      setLogoutBusy(false);
    }
  }

  async function startMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    setRecoveryCodes([]);
    try {
      const setup = await startLilyMfaSetup(String(data.get("currentPassword") || ""), session.csrfToken);
      setMfaSetup(setup);
      setMessage("MFA iniciada. Cadastre a chave no autenticador e confirme o código de 6 dígitos.");
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await confirmLilyMfaSetup(String(data.get("code") || ""), session.csrfToken);
      setRecoveryCodes(result.recoveryCodes);
      setMfaSetup(null);
      await refresh();
      setMessage("MFA ativada. Guarde os códigos de recuperação em local seguro; eles aparecem somente agora.");
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await verifyLilyMfa(String(data.get("code") || ""), session.csrfToken);
      await refresh();
      setMessage(result.method === "recovery"
        ? `Segundo fator confirmado com código de recuperação. Restam ${result.recoveryCodesRemaining}.`
        : "Segundo fator confirmado.");
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o segundo fator.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOtherSessions() {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await revokeOtherLilySessions(session.csrfToken);
      await refresh();
      setMessage(result.revoked > 0
        ? `${result.revoked} outra(s) sessão(ões) encerrada(s).`
        : "Não havia outras sessões ativas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível encerrar as outras sessões.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") || "");
    const newPassword = String(data.get("newPassword") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não coincide.");
      return;
    }

    setBusy(true);
    try {
      const result = await changeLilyPassword({ currentPassword, newPassword }, session.csrfToken);
      form.reset();
      await refresh();
      setMessage(result.otherSessionsRevoked > 0
        ? `Senha atualizada. ${result.otherSessionsRevoked} outra(s) sessão(ões) foram encerradas.`
        : "Senha atualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <section className="checkout-page loading-state"><LilyLoadingSpinner size="lg" label="Carregando perfil" /></section>;
  if (!session || !profile) return <AccountRequired />;

  const passwordMinimum = ["staff", "courier", "admin"].includes(session.user.role) ? 12 : 8;
  const privileged = ["staff", "courier", "admin"].includes(session.user.role);
  const nextPathRaw = new URLSearchParams(window.location.search).get("next");
  const nextPath = nextPathRaw
    && (nextPathRaw.startsWith("/painel") || nextPathRaw.startsWith("/entregas"))
    && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : null;

  return <section className="profile-page">
    {session.user.staffPasswordUpgradeRequired && <div className="operation-warning security-upgrade-warning">
      <strong>Atualização de senha obrigatória.</strong>
      <p>Sua conta foi promovida para a equipe. Defina abaixo uma nova senha com pelo menos 12 caracteres antes de configurar o segundo fator.</p>
    </div>}
    {privileged && mfaStatus?.setupRequired && !session.user.staffPasswordUpgradeRequired && <div className="operation-warning security-upgrade-warning">
      <strong>MFA obrigatória para a equipe.</strong>
      <p>Configure um autenticador TOTP antes de acessar o área operacional.</p>
    </div>}
    {privileged && mfaStatus?.enabled && !mfaStatus.verified && <div className="operation-warning security-upgrade-warning">
      <strong>Confirme o segundo fator.</strong>
      <p>Digite o código do autenticador ou um código de recuperação para liberar funções administrativas nesta sessão.</p>
    </div>}

    <div className="profile-heading">
      <button ref={avatarTriggerRef} className="profile-avatar-trigger" type="button" aria-label="Ampliar foto de perfil" onClick={() => { setError(""); setMessage(""); setAvatarPreviewOpen(true); }}>
        <ProfileAvatar name={profile.user.displayName} url={profile.user.avatarUrl} large />
      </button>
      <input ref={avatarInputRef} className="profile-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher nova foto de perfil" onChange={handleAvatarFileChange} />
      <div className="profile-heading-copy">
        <span className="eyebrow">Minha conta</span>
        <div className="profile-heading-name">
          <h1>{profile.user.displayName || "Seu perfil CookLily"}</h1>
          <button className="profile-edit-icon" type="button" aria-label="Editar perfil" title="Editar perfil" onClick={focusProfileEditor}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
          </button>
        </div>
        <p>{formatBrazilianPhone(profile.user.phone)}</p>
      </div>
    </div>

    <div className="profile-stats">
      <article><strong>{profile.loyalty.points}</strong><span>pontos</span></article>
      <article><strong>{profile.loyalty.orderCount}</strong><span>pedidos pontuados</span></article>
      <article><strong>{profile.loyalty.rank ? `#${profile.loyalty.rank}` : "—"}</strong><span>posição pública</span></article>
    </div>

    <div className="profile-grid">
      <form ref={editFormRef} id="profile-edit-form" className="checkout-section profile-edit-form" onSubmit={submit}>
        <h2>Dados do perfil</h2>
        <label>Nome público
          <input ref={displayNameInputRef} name="displayName" defaultValue={profile.user.displayName ?? ""} maxLength={80} autoComplete="name" />
        </label>
        <label className="check">
          <input name="rankingOptIn" type="checkbox" defaultChecked={profile.user.rankingOptIn} />
          <span>Quero aparecer no ranking público CookLily com meu nome e foto.</span>
        </label>
        <label className="check">
          <input name="whatsappUpdatesOptIn" type="checkbox" defaultChecked={profile.user.whatsappUpdatesOptIn} />
          <span>Receber atualizações do pedido pelo WhatsApp.</span>
        </label>
        <label className="check">
          <input name="whatsappOffersOptIn" type="checkbox" defaultChecked={profile.user.whatsappOffersOptIn} />
          <span>Receber ofertas especiais e cupons pelo WhatsApp.</span>
        </label>
        <button className="button primary" type="submit" disabled={busy}>{busy ? <LilyLoadingSpinner size="sm" label="Salvando perfil" /> : "Salvar perfil"}</button>
      </form>

      {privileged && <section className="checkout-section security-mfa-section">
        <h2>Autenticação em dois fatores</h2>
        {mfaStatus?.enabled
          ? <>
              <p>MFA está ativa. {mfaStatus.verified ? "Esta sessão já confirmou o segundo fator." : "Confirme o código para liberar o painel."}</p>
              {!mfaStatus.verified && <form onSubmit={verifyMfa}>
                <label>Código do autenticador ou recuperação
                  <input name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={32} required />
                </label>
                <button className="button primary" type="submit" disabled={busy}>{busy ? <LilyLoadingSpinner size="sm" label="Verificando segundo fator" /> : "Confirmar segundo fator"}</button>
              </form>}
              <small>{mfaStatus.recoveryCodesRemaining} código(s) de recuperação ainda disponíveis.</small>
            </>
          : session.user.staffPasswordUpgradeRequired
            ? <p>Troque sua senha primeiro; depois a configuração do MFA será liberada.</p>
            : <>
                <p>Use um aplicativo autenticador compatível com TOTP. A chave é cifrada no banco; nunca é gravada no repositório.</p>
                {!mfaSetup && <form onSubmit={startMfa}>
                  <label>Senha atual
                    <input name="currentPassword" type="password" autoComplete="current-password" required />
                  </label>
                  <button className="button primary" type="submit" disabled={busy}>{busy ? <LilyLoadingSpinner size="sm" label="Preparando MFA" /> : "Configurar MFA"}</button>
                </form>}
                {mfaSetup && <>
                  <div className="mfa-secret-box">
                    <strong>Chave do autenticador</strong>
                    <code>{mfaSetup.secret}</code>
                    <small>Conta: CookLily · TOTP · 6 dígitos · período de 30 segundos.</small>
                  </div>
                  <form onSubmit={confirmMfa}>
                    <label>Código de 6 dígitos
                      <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
                    </label>
                    <button className="button primary" type="submit" disabled={busy}>{busy ? <LilyLoadingSpinner size="sm" label="Confirmando MFA" /> : "Ativar MFA"}</button>
                  </form>
                </>}
              </>}
        {recoveryCodes.length > 0 && <div className="mfa-recovery-box" role="status">
          <strong>Códigos de recuperação — copie agora</strong>
          <p>Cada código funciona uma única vez.</p>
          <div>{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>
        </div>}
        {nextPath && mfaStatus?.verified && <Link className="button primary" to={nextPath}>Continuar para o painel</Link>}
      </section>}

      <section className="checkout-section account-sessions-section">
        <h2>Sessões da conta</h2>
        <p>Revise onde sua conta está ativa e encerre todas as outras sessões sem desconectar este dispositivo.</p>
        <div className="account-session-list">
          {sessions.map((item) => <article key={item.id} className={item.current ? "is-current" : ""}>
            <div>
              <strong>{item.current ? "Esta sessão" : "Outra sessão"}</strong>
              <small>Última atividade: {new Date(item.lastSeenAt).toLocaleString("pt-BR")}</small>
              <small>Expira: {new Date(item.expiresAt).toLocaleString("pt-BR")}</small>
            </div>
            {privileged && <span className={item.mfaVerified ? "state-live" : "state-off"}>{item.mfaVerified ? "MFA confirmada" : "MFA pendente"}</span>}
          </article>)}
        </div>
        <button className="button ghost" type="button" onClick={() => void revokeOtherSessions()} disabled={busy || sessions.filter((item) => !item.current).length === 0}>
          Encerrar outras sessões
        </button>
      </section>

      <form className="checkout-section" onSubmit={changePassword}>
        <h2>Segurança</h2>
        <p>Troque sua senha informando a atual. {passwordMinimum === 12 ? "Contas da equipe exigem pelo menos 12 caracteres." : "Clientes exigem pelo menos 8 caracteres."} Outras sessões serão encerradas.</p>
        <label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={passwordMinimum} maxLength={128} required /></label>
        <label>Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={passwordMinimum} maxLength={128} required /></label>
        <button className="button ghost" type="submit" disabled={busy}>{busy ? <LilyLoadingSpinner size="sm" label="Atualizando senha" /> : "Trocar senha"}</button>
      </form>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}

    <div className="account-link-grid">
      <Link to="/pedidos"><strong>Meus pedidos</strong><span>Veja seu histórico</span></Link>
      <Link to="/enderecos"><strong>Endereços</strong><span>Gerencie entrega</span></Link>
      <Link to="/ranking"><strong>Ranking CookLily</strong><span>Veja os clientes com mais pontos</span></Link>
    </div>
    <div className="profile-logout-footer">
      <button className="profile-logout-link" type="button" onClick={handleLogout} disabled={logoutBusy}>
        {logoutBusy ? <LilyLoadingSpinner size="sm" label="Saindo da conta" /> : "Sair da conta"}
      </button>
    </div>

    {avatarPreviewOpen && <div className="profile-avatar-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setAvatarPreviewOpen(false);
    }}>
      <section className="profile-avatar-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-avatar-modal-title" onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const actions = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = actions[0];
        const last = actions[actions.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}>
        <div className="profile-avatar-modal-toolbar">
          <button className="profile-avatar-modal-action" type="button" aria-label="Trocar foto de perfil" title="Trocar foto de perfil" onClick={() => avatarInputRef.current?.click()} disabled={busy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
          </button>
          <span id="profile-avatar-modal-title">Foto de perfil</span>
          <button ref={avatarCloseRef} className="profile-avatar-modal-action" type="button" aria-label="Fechar visualização da foto" title="Fechar" onClick={() => setAvatarPreviewOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className="profile-avatar-modal-content">
          {profile.user.avatarUrl
            ? <img className="profile-avatar-modal-image" src={profile.user.avatarUrl} alt={profile.user.displayName ? `Foto de perfil de ${profile.user.displayName}` : "Foto de perfil"} />
            : <ProfileAvatar name={profile.user.displayName} url={null} large />}
        </div>
        {busy && <p className="profile-avatar-modal-status" role="status"><LilyLoadingSpinner size="sm" label="Enviando foto" /></p>}
        {error && <p className="profile-avatar-modal-error" role="alert">{error}</p>}
        {message && !busy && <p className="profile-avatar-modal-status" role="status">{message}</p>}
        <p className="profile-avatar-modal-hint">Toque no lápis para escolher outra foto. O editor permite mover e aproximar a imagem antes de salvar.</p>
      </section>
    </div>}
  </section>;
}

export function RankingPage() {
  const [ranking, setRanking] = useState<LilyRankingRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getLilyRanking(30)
      .then((value) => setRanking(value.ranking))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o ranking."));
  }, []);

  return <section className="ranking-page">
    <div className="checkout-heading">
      <div>
        <span className="eyebrow">Comunidade CookLily</span>
        <h1>Ranking de clientes</h1>
        <p>Compras pagas/concluídas e campanhas rastreadas geram pontos. Só aparece aqui quem optou por participar.</p>
      </div>
      <Link className="button ghost" to="/perfil">Meu perfil</Link>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {ranking === null ? <p>Carregando ranking...</p> : ranking.length === 0
      ? <section className="empty-state"><h2>O ranking está começando.</h2><p>Os clientes aparecerão aqui quando optarem por participar e acumularem pontos.</p></section>
      : <div className="ranking-list">
        {ranking.map((row) => <article key={`${row.rank}-${row.displayName}`}>
          <strong className="ranking-position">#{row.rank}</strong>
          <ProfileAvatar name={row.displayName} url={row.avatarUrl} />
          <div><strong>{row.displayName}</strong><small>{row.orderCount} pedidos pontuados · {row.campaignCount} campanhas</small></div>
          <strong>{row.points} pts</strong>
        </article>)}
      </div>}
  </section>;
}
