import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  changeLilyPassword,
  getLilyProfile,
  getLilyRanking,
  getLilySession,
  logoutLily,
  updateLilyProfile,
  uploadLilyProfileAvatar,
  type AuthPayload,
  type LilyProfilePayload,
  type LilyRankingRow
} from "../../api";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const current = await getLilySession();
    setSession(current);
    setProfile(await getLilyProfile());
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

  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    const file = data.get("avatar");
    if (!(file instanceof File) || file.size === 0) return;
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
      event.currentTarget.reset();
      setMessage("Foto de perfil atualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
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

  if (!loaded) return <section className="checkout-page"><h1>Carregando perfil...</h1></section>;
  if (!session || !profile) return <AccountRequired />;

  const passwordMinimum = ["staff", "admin"].includes(session.user.role) ? 12 : 8;

  return <section className="profile-page">
    {session.user.staffPasswordUpgradeRequired && <div className="operation-warning security-upgrade-warning">
      <strong>Atualização de senha obrigatória.</strong>
      <p>Sua conta foi promovida para a equipe. Defina abaixo uma nova senha com pelo menos 12 caracteres antes de acessar o painel administrativo.</p>
    </div>}

    <div className="profile-heading">
      <ProfileAvatar name={profile.user.displayName} url={profile.user.avatarUrl} large />
      <div className="profile-heading-copy">
        <span className="eyebrow">Minha conta</span>
        <h1>{profile.user.displayName || "Seu perfil CookLily"}</h1>
        <p>{profile.user.phone}</p>
      </div>
      <button className="button ghost profile-logout-button" type="button" onClick={handleLogout} disabled={logoutBusy}>
        {logoutBusy ? "Saindo..." : "Sair da conta"}
      </button>
    </div>

    <div className="profile-stats">
      <article><strong>{profile.loyalty.points}</strong><span>pontos</span></article>
      <article><strong>{profile.loyalty.orderCount}</strong><span>pedidos pontuados</span></article>
      <article><strong>{profile.loyalty.rank ? `#${profile.loyalty.rank}` : "—"}</strong><span>posição pública</span></article>
    </div>

    <div className="profile-grid">
      <form className="checkout-section" onSubmit={submit}>
        <h2>Editar perfil</h2>
        <label>Nome público
          <input name="displayName" defaultValue={profile.user.displayName ?? ""} maxLength={80} autoComplete="name" />
        </label>
        <label className="check">
          <input name="rankingOptIn" type="checkbox" defaultChecked={profile.user.rankingOptIn} />
          <span>Quero aparecer no ranking público CookLily com meu nome e foto.</span>
        </label>
        <button className="button primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar perfil"}</button>
      </form>

      <form className="checkout-section" onSubmit={uploadAvatar}>
        <h2>Foto de perfil</h2>
        <p>JPEG, PNG ou WebP de até 2 MB.</p>
        <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required />
        <button className="button ghost" type="submit" disabled={busy}>{busy ? "Enviando..." : "Atualizar foto"}</button>
      </form>

      <form className="checkout-section" onSubmit={changePassword}>
        <h2>Segurança</h2>
        <p>Troque sua senha informando a atual. {passwordMinimum === 12 ? "Contas da equipe exigem pelo menos 12 caracteres." : "Clientes exigem pelo menos 8 caracteres."} Outras sessões serão encerradas.</p>
        <label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={passwordMinimum} maxLength={128} required /></label>
        <label>Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={passwordMinimum} maxLength={128} required /></label>
        <button className="button ghost" type="submit" disabled={busy}>{busy ? "Atualizando..." : "Trocar senha"}</button>
      </form>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}

    <div className="account-link-grid">
      <Link to="/pedidos"><strong>Meus pedidos</strong><span>Veja seu histórico</span></Link>
      <Link to="/enderecos"><strong>Endereços</strong><span>Gerencie entrega</span></Link>
      <Link to="/ranking"><strong>Ranking CookLily</strong><span>Veja os clientes com mais pontos</span></Link>
    </div>
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
