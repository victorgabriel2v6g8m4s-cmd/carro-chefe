import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type SurveyRewardPayload = {
  pointsAwarded: number;
  currentPoints: number;
  unlockedMissions: Array<{ id: string; title: string; points: number }>;
};

export type SurveyProgressTarget = { label: string; remaining: number; currentPoints: number; targetPoints: number; progressPercent: number } | null;

function SurveyProgressCard({ target, currentPoints }: { target: SurveyProgressTarget; currentPoints: number }) {
  const finalProgress = target ? Math.min(100, Math.floor(currentPoints / target.targetPoints * 100)) : 0;
  const [displayedProgress, setDisplayedProgress] = useState(target?.progressPercent ?? 0);
  useEffect(() => {
    if (!target) return;
    setDisplayedProgress(target.progressPercent);
    const frame = window.requestAnimationFrame(() => setDisplayedProgress(finalProgress));
    return () => window.cancelAnimationFrame(frame);
  }, [target, finalProgress]);
  if (!target) return null;
  return <div className="survey-next-level"><span>Próxima conquista</span><strong>{target.label}</strong><div className="survey-target-meter" role="progressbar" aria-label={`Progresso até ${target.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={finalProgress}><span style={{ width: `${displayedProgress}%` }} /></div>{currentPoints >= target.targetPoints ? <small>Você já pode solicitar este benefício.</small> : <small>{currentPoints.toLocaleString("pt-BR")} de {target.targetPoints.toLocaleString("pt-BR")} pontos · faltam {(target.targetPoints - currentPoints).toLocaleString("pt-BR")}</small>}</div>;
}

export function SurveyReward({ reward, progressTarget }: { reward: SurveyRewardPayload; progressTarget: SurveyProgressTarget }) {
  return <section className="survey-reward" aria-live="polite">
    {reward.pointsAwarded > 0 && <div className="survey-reward-confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ left: `${(index * 37 + 9) % 100}%`, "--confetti-drift": `${((index * 19) % 110) - 55}px`, "--confetti-hue": `${(index * 47) % 360}`, animationDelay: `${-(index % 7) * 55}ms` } as React.CSSProperties} />)}</div>}
    <div className="reward-glow" aria-hidden="true">✦</div>
    <span className="eyebrow">Pesquisa concluída</span>
    <h1>Mandou bem!</h1>
    <p>Obrigado por compartilhar sua opinião.</p>
    {reward.pointsAwarded > 0 && <div className="reward-points"><strong>+{reward.pointsAwarded.toLocaleString("pt-BR")}</strong><span>pontos ganhos</span><div className="reward-meter" role="progressbar" aria-label="Pontos desta pesquisa creditados" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span /></div><small>Recompensa creditada · seu saldo agora é {reward.currentPoints.toLocaleString("pt-BR")} pontos</small></div>}
    <SurveyProgressCard target={progressTarget} currentPoints={reward.currentPoints} />
    {reward.unlockedMissions.length > 0 && <div className="survey-unlocked"><h2>Nova missão desbloqueada</h2>{reward.unlockedMissions.map((mission) => <p key={mission.id}>{mission.title} · {mission.points} pontos</p>)}</div>}
    <p className="reward-note">{reward.pointsAwarded > 0 ? "Cada resposta aproxima você de novas experiências CookLily." : "Sua participação nos ajuda a melhorar a CookLily."}</p>
    <div className="survey-actions"><Link className="button primary" to="/dashboard">Continuar</Link><Link className="button ghost" to="/pesquisas">Ver outras pesquisas</Link></div>
  </section>;
}
