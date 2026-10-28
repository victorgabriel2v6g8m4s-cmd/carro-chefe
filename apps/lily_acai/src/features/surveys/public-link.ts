type SurveyIdentity = { id: string; publicToken?: string | null };

export function surveyPublicToken(saved: SurveyIdentity, previous?: SurveyIdentity) {
  return saved.publicToken ?? previous?.publicToken ?? null;
}

export function surveyPublicLink(origin: string, baseUrl: string, survey: SurveyIdentity) {
  return `${origin}${baseUrl}pesquisas/${encodeURIComponent(survey.publicToken || survey.id)}`;
}
