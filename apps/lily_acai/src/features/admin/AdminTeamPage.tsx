import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { getLilyTeam, promoteLilyTeamMember, updateLilyTeamMember, type LilyTeamMember } from "./team-api";

export function AdminTeamPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [members, setMembers] = useState<LilyTeamMember[] | null>(null);
  const [query, setQuery] = useState("");
  const [includeCustomers, setIncludeCustomers] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh(nextQuery = query, nextIncludeCustomers = includeCustomers) {
    const current = await getLilySession();
    if (current.user.role !== "admin") throw new Error("Esta área exige perfil admin CookLily.");
    const result = await getLilyTeam({ q: nextQuery || undefined, includeCustomers: nextIncludeCustomers });
    setSession(current);
    setMembers(result.members);
  }

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar a equipe."))
      .finally(() => setLoaded(true));
  }, []);

  async function promote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusyId("promote");
    setError("");
    setMessage("");
    try {
      const member = await promoteLilyTeamMember({
        phone: String(data.get("phone") || ""),
        role: String(data.get("role") || "staff") as "staff" | "admin"
      }, session.csrfToken);
      form.reset();
      setMessage(`${member.phone} promovido para ${member.role}. A conta precisa atualizar a senha antes de usar funções administrativas.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível promover a conta.");
    } finally {
      setBusyId("");
    }
  }

  async function update(member: LilyTeamMember, input: { role?: "customer" | "staff" | "admin"; status?: "active" | "suspended" }) {
    if (!session) return;
    setBusyId(member.id);
    setError("");
    setMessage("");
    try {
      const updated = await updateLilyTeamMember(member.id, input, session.csrfToken);
      setMessage(`Conta ${updated.phone} atualizada.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a conta.");
    } finally {
      setBusyId("");
    }
  }

  if (!loaded) return <section className="admin-state"><h1>Carregando equipe...</h1></section>;
  if (!session || !members) return <section className="admin-state">
    <span className="eyebrow">CookLily · segurança</span>
    <h1>Acesso admin necessário.</h1>
    <p>{error || "Somente administradores gerenciam a equipe."}</p>
    <Link className="button primary" to="/entrar?next=/painel/equipe">Entrar</Link>
  </section>;

  return <section className="admin-page team-admin-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">Segurança e permissões</span>
        <h1>Equipe CookLily</h1>
        <p>Crie a conta pelo fluxo normal e promova aqui. Promoções exigem troca de senha antes do primeiro acesso administrativo.</p>
      </div>
      <Link className="button ghost" to="/painel">Painel</Link>
    </div>

    <form className="checkout-section team-promote-form" onSubmit={promote}>
      <div>
        <h2>Promover conta existente</h2>
        <p>O painel nunca cria senha para funcionários. A pessoa cria a própria conta e o admin concede o papel.</p>
      </div>
      <label>Telefone da conta
        <input name="phone" inputMode="tel" autoComplete="tel" required placeholder="(67) 99999-9999" />
      </label>
      <label>Papel
        <select name="role" defaultValue="staff">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button className="button primary" type="submit" disabled={busyId === "promote"}>
        {busyId === "promote" ? "Promovendo..." : "Promover conta"}
      </button>
    </form>

    <div className="team-toolbar">
      <label>Buscar
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou telefone" />
      </label>
      <label className="check">
        <input type="checkbox" checked={includeCustomers} onChange={(event) => setIncludeCustomers(event.target.checked)} />
        <span>Incluir clientes</span>
      </label>
      <button className="button ghost" type="button" onClick={() => void refresh(query, includeCustomers)}>Buscar</button>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}

    <div className="team-list">
      {members.map((member) => <article className="team-member-card" key={member.id}>
        <div className="team-member-identity">
          <strong>{member.displayName || member.phone}</strong>
          {member.displayName && <small>{member.phone}</small>}
          <div className="team-member-badges">
            <span className={`team-role role-${member.role}`}>{member.role}</span>
            <span className={member.status === "active" ? "state-live" : "state-off"}>{member.status}</span>
            {member.staffPasswordUpgradeRequired && <span className="team-password-warning">senha pendente</span>}
          </div>
        </div>
        <div className="team-member-meta">
          <span>{member.activeSessions} sessão(ões) ativa(s)</span>
          <small>Conta desde {new Date(member.createdAt).toLocaleDateString("pt-BR")}</small>
        </div>
        <div className="team-member-actions">
          <label>Papel
            <select
              value={member.role}
              disabled={busyId === member.id}
              onChange={(event) => void update(member, { role: event.target.value as "customer" | "staff" | "admin" })}
            >
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="button ghost" type="button" disabled={busyId === member.id} onClick={() => void update(member, {
            status: member.status === "active" ? "suspended" : "active"
          })}>
            {member.status === "active" ? "Suspender" : "Reativar"}
          </button>
        </div>
      </article>)}
      {members.length === 0 && <div className="empty-state"><p>Nenhuma conta encontrada.</p></div>}
    </div>
  </section>;
}
