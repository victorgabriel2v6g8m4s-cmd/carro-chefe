import { StatusBadge } from "./StatusBadge";
import { RichReferences } from "./RichReferences";
import { messages } from "../i18n";
import type { RunReport } from "../types";

function ResultList({ title, items, tone, empty }: { title: string; items: string[]; tone: string; empty: string }) {
  return <section className={`outcome-column outcome-column--${tone}`}><div><i /> <strong>{title}</strong><span>{items.length}</span></div>{items.length ? <ul>{items.map((item, index) => <li key={`${tone}-${index}`}><RichReferences text={item} /></li>)}</ul> : <p>{empty}</p>}</section>;
}

export function RunOutcomeReport({ report }: { report: RunReport | null | undefined }) {
  if (!report) return null;
  return <section className={`panel outcome-report outcome-report--${report.outcome}`}>
    <div className="section-title"><div><span className="eyebrow">Output consolidado</span><h3>Resultado da execução</h3></div><StatusBadge status={report.outcome} /></div>
    <p className="outcome-summary"><RichReferences text={report.summary} /></p>
    {report.diagnosis && <div className="diagnosis-box"><small>Causa provável</small><strong><RichReferences text={report.diagnosis} /></strong></div>}
    <div className="outcome-grid"><ResultList title="O que funcionou" items={report.successes ?? []} tone="success" empty={messages.executions.outcome.noSuccesses} /><ResultList title="O que falhou" items={report.failures ?? []} tone="failure" empty={messages.executions.outcome.noFailures} /><ResultList title="O que fazer a seguir" items={report.recommendations ?? []} tone="next" empty={messages.executions.outcome.noRecommendations} /></div>
    {(report.evidence ?? []).length > 0 && <details className="report-evidence"><summary>Evidências usadas no diagnóstico</summary><ul>{(report.evidence ?? []).map((item, index) => <li key={index}><RichReferences text={item} /></li>)}</ul></details>}
    <small className="report-source">Relatório {report.derived ? "derivado do histórico existente" : `registrado por ${report.generatedBy}`}.</small>
  </section>;
}
