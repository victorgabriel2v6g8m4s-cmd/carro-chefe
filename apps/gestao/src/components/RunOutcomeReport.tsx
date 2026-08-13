import { StatusBadge } from "./StatusBadge";

function ResultList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <section className={`outcome-column outcome-column--${tone}`}><div><i /> <strong>{title}</strong><span>{items.length}</span></div>{items.length ? <ul>{items.map((item, index) => <li key={`${tone}-${index}`}>{item}</li>)}</ul> : <p>Nenhum item registrado.</p>}</section>;
}

export function RunOutcomeReport({ report }: { report: any }) {
  if (!report) return null;
  return <section className={`panel outcome-report outcome-report--${report.outcome}`}>
    <div className="section-title"><div><span className="eyebrow">Output consolidado</span><h3>Resultado da execução</h3></div><StatusBadge status={report.outcome} /></div>
    <p className="outcome-summary">{report.summary}</p>
    {report.diagnosis && <div className="diagnosis-box"><small>Causa provável</small><strong>{report.diagnosis}</strong></div>}
    <div className="outcome-grid"><ResultList title="O que funcionou" items={report.successes ?? []} tone="success" /><ResultList title="O que falhou" items={report.failures ?? []} tone="failure" /><ResultList title="O que fazer a seguir" items={report.recommendations ?? []} tone="next" /></div>
    {report.evidence?.length > 0 && <details className="report-evidence"><summary>Evidências usadas no diagnóstico</summary><ul>{report.evidence.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul></details>}
    <small className="report-source">Relatório {report.derived ? "derivado do histórico existente" : `registrado por ${report.generatedBy}`}.</small>
  </section>;
}
