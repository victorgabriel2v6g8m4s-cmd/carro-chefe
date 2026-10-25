import { QuestionInput } from "./QuestionInput";
import type { SurveyAnalytics, SurveyDefinition } from "./api";

function formatAverageTime(milliseconds: number | null) {
  if (milliseconds === null) return "Sem tempo registrado";
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export function SurveyAnalyticsPanel({ definition, analytics, loading = false, error = "" }: {
  definition: SurveyDefinition;
  analytics: SurveyAnalytics | null;
  loading?: boolean;
  error?: string;
}) {
  return <section className="survey-analytics" aria-label="Prévia e estatísticas da pesquisa">
    <div className="survey-analytics-kpis"><article><strong>{analytics?.views ?? 0}</strong><span>visualizações</span></article><article><strong>{analytics?.responses ?? 0}</strong><span>respostas</span></article></div>
    {loading && <p role="status">Carregando estatísticas…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="survey-question-accordions">{definition.questions.map((question, index) => {
      const metric = analytics?.questions.find((item) => item.questionId === question.id);
      const maxCount = Math.max(1, ...(metric?.options.map((option) => option.count) ?? []));
      return <details className="survey-analytics-question" key={question.id}>
        <summary><span>Pergunta {index + 1}</span><strong>{question.title || "Pergunta sem título"}</strong></summary>
        <div className="survey-analytics-question-body">
          <fieldset className={`survey-question font-${question.style?.fontSize ?? "md"} ${question.style?.bold ? "is-bold" : ""} ${question.style?.italic ? "is-italic" : ""}`}><legend>{question.title || "Pergunta sem título"}</legend>{question.description && <p>{question.description}</p>}<QuestionInput question={question} value={undefined} onChange={() => undefined} surveyId="preview" disabled /></fieldset>
          <details className="survey-question-statistics"><summary>Estatísticas da pergunta</summary>
            <p>{metric?.answered ?? 0} respostas · média de {formatAverageTime(metric?.averageTimeMs ?? null)} por usuário</p>
            {metric?.options.length ? <div className="survey-option-chart" role="list" aria-label={`Seleções para ${question.title}`}>
              {metric.options.map((option) => <div className="survey-option-chart-row" role="listitem" key={option.label}><span title={option.label}>{option.label}</span><div className="survey-option-chart-track" aria-hidden="true"><span style={{ width: `${Math.max(option.count ? 2 : 0, option.count / maxCount * 100)}%` }} /></div><strong>{option.count}</strong></div>)}
            </div> : <p className="survey-analytics-empty">Resposta aberta ou ainda sem seleções categorizáveis.</p>}
          </details>
        </div>
      </details>;
    })}</div>
  </section>;
}
