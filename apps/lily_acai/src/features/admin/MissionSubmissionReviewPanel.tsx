import { useEffect, useState } from "react";
import { getLilySession, parseResponse, type AuthPayload } from "../../api";

type Submission = {
  id: string; status: string; periodKey: string; username: string | null; evidenceText: string | null;
  reviewNote: string | null; submittedAt: string; evidenceUrl: string;
  mission: { id: string; title: string; points: number; lilyCoins: number; cadence: string };
  user: { id: string; displayName: string | null };
};

export function MissionSubmissionReviewPanel() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const auth = session ?? await getLilySession();
    setSession(auth);
    const result = await parseResponse<{ submissions: Submission[] }>(await fetch("/api/v1/lily/admin/missions/submissions?status=pending", { credentials: "same-origin" }));
    setSubmissions(result.submissions);
  }

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as comprovações.")); }, []);

  async function review(id: string, decision: "approved" | "rejected") {
    if (!session) return;
    setBusy(id); setError("");
    try {
      await parseResponse(await fetch(`/api/v1/lily/admin/missions/submissions/${encodeURIComponent(id)}`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken },
        body: JSON.stringify({ decision })
      }));
      setSubmissions((current) => current.filter((submission) => submission.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível analisar a comprovação."); }
    finally { setBusy(""); }
  }

  return <section className="loyalty-admin-section"><span className="eyebrow">Missões · análise</span><h2>Comprovações pendentes</h2>{error && <p className="error" role="alert">{error}</p>}<div className="loyalty-reward-grid">{submissions.map((submission) => <article className="loyalty-reward-card" key={submission.id}><h3>{submission.mission.title}</h3><p>{submission.user.displayName || "Cliente"} · {submission.username ? `@${submission.username}` : ""}</p><p>Enviada em {new Date(submission.submittedAt).toLocaleString("pt-BR")}</p>{submission.evidenceText && <p>{submission.evidenceText}</p>}<a href={submission.evidenceUrl} target="_blank" rel="noreferrer">Abrir comprovante privado</a><div className="mission-review-actions"><button className="button primary" disabled={Boolean(busy)} onClick={() => void review(submission.id, "approved")}>{busy === submission.id ? "Salvando…" : "Aprovar e creditar"}</button><button className="button ghost" disabled={Boolean(busy)} onClick={() => void review(submission.id, "rejected")}>Recusar</button></div></article>)}</div>{!submissions.length && <p>Não há comprovações aguardando análise.</p>}</section>;
}
