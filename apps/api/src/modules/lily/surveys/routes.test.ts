import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "../auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(role: "customer" | "staff", phone: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    remoteAddress: `127.0.2.${Number(phone.slice(-2)) || 1}`,
    headers: { origin },
    payload: {
      phone,
      password: "senha-cooklily-pesquisas-2026",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  const cookie = cookieFrom(response);
  const userId = response.json().user.id as string;
  if (role === "staff") {
    await lilyPrisma.lilyUser.update({ where: { id: userId }, data: { role: "staff", mfaEnabled: true } });
    await lilyPrisma.lilySession.updateMany({ where: { userId }, data: { mfaVerifiedAt: new Date() } });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { cookie, csrf: me.json().csrfToken as string, userId };
}

const definition = (title: string) => ({ title, questions: [{ id: "q1", type: "short_answer", title: "Resposta" }] });

async function createSurvey(cookie: string, csrf: string, title: string) {
  const response = await app.inject({ method: "POST", url: "/api/v1/lily/admin/surveys", headers: { cookie, "x-lily-csrf": csrf, origin }, payload: definition(title) });
  expect(response.statusCode).toBe(200);
  return response.json().survey as { id: string; version: number; status: string };
}

beforeEach(async () => {
  await lilyPrisma.lilySurveyUpload.deleteMany();
  await lilyPrisma.lilySurveyResponse.deleteMany();
  await lilyPrisma.lilySurveyParticipation.deleteMany();
  await lilyPrisma.lilySurveyQuestionMetric.deleteMany();
  await lilyPrisma.lilySurveyView.deleteMany();
  await lilyPrisma.lilySurvey.deleteMany();
  await lilyPrisma.lilyCustomerNotification.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
});

afterAll(async () => { await app.close(); });

describe.sequential("CookLily survey lifecycle", () => {
  it("counts and stores only the answers on the customer's selected branch", async () => {
    const staff = await register("staff", "67911115551");
    const customer = await register("customer", "67911115552");
    const created = await app.inject({ method: "POST", url: "/api/v1/lily/admin/surveys", headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {
      title: "Preferências de doces",
      questions: [
        { id: "tried", type: "single_choice", title: "Já provou esse sabor?", required: true, options: ["Sim", "Não"] },
        { id: "liked", type: "short_answer", title: "O que mais gostou?", required: true, visibility: { questionId: "tried", operator: "equals", value: "Sim" } },
        { id: "want", type: "short_answer", title: "Qual doce gostaria?", required: true, visibility: { questionId: "tried", operator: "equals", value: "Não" } }
      ],
      pointsPerForm: 5, pointsPerAnswer: 10, showPoints: true
    } });
    expect(created.statusCode).toBe(200);
    const survey = created.json().survey as { id: string; version: number };
    await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/publish`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    const participation = await lilyPrisma.lilySurveyParticipation.create({ data: { userId: customer.userId, surveyId: survey.id, surveyVersion: survey.version } });
    const answers = { tried: "Não", liked: "resposta antiga que não pode ser salva", want: "Pudim" };

    const progress = await app.inject({ method: "POST", url: `/api/v1/lily/surveys/${survey.id}/progress`, headers: { cookie: customer.cookie, "x-lily-csrf": customer.csrf, origin }, payload: { participationId: participation.id, answers } });
    expect(progress.json().progressPercent).toBe(100);
    const submitted = await app.inject({ method: "POST", url: `/api/v1/lily/surveys/${survey.id}/submit`, headers: { cookie: customer.cookie, "x-lily-csrf": customer.csrf, origin }, payload: { participationId: participation.id, answers, consentToLinkAnswers: false } });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json().pointsAwarded).toBe(25);
    const response = await lilyPrisma.lilySurveyResponse.findFirstOrThrow({ where: { surveyId: survey.id } });
    expect(JSON.parse(response.answersJson)).toEqual({ tried: "Não", want: "Pudim" });
  });

  it("credits configured survey points to the customer's loyalty balance", async () => {
    const staff = await register("staff", "67911114441");
    const customer = await register("customer", "67911114442");
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/surveys",
      headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin },
      payload: { ...definition("Pesquisa pontuada"), pointsPerForm: 15, pointsPerAnswer: 25, showPoints: true }
    });
    expect(created.statusCode).toBe(200);
    const survey = created.json().survey as { id: string; version: number };
    await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/publish`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    const participation = await lilyPrisma.lilySurveyParticipation.create({ data: { userId: customer.userId, surveyId: survey.id, surveyVersion: survey.version } });

    const submitted = await app.inject({ method: "POST", url: `/api/v1/lily/surveys/${survey.id}/submit`, headers: { cookie: customer.cookie, "x-lily-csrf": customer.csrf, origin }, payload: { participationId: participation.id, answers: { q1: "Resposta válida" }, consentToLinkAnswers: false } });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json().pointsAwarded).toBe(40);
    expect(await lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: customer.userId, type: "survey_reward" } })).toMatchObject([{ points: 40 }]);

    const profile = await app.inject({ method: "GET", url: "/api/v1/lily/customer/profile", headers: { cookie: customer.cookie } });
    expect(profile.json().loyalty.points).toBe(40);
  });

  it("public survey links show only a reward preview before login and never expose internal IDs or questions", async () => {
    const staff = await register("staff", "67911114451");
    const customer = await register("customer", "67911114452");
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/surveys",
      headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin },
      payload: { ...definition("Pesquisa de teste público"), description: "Conteúdo de apresentação", estimatedMinutes: 4, pointsPerForm: 20, pointsPerAnswer: 30, showPoints: true }
    });
    expect(created.statusCode).toBe(200);
    const createdSurvey = created.json().survey as { id: string; publicToken: string; version: number };
    expect(createdSurvey.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createdSurvey.publicToken).not.toBe(createdSurvey.id);
    await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${createdSurvey.id}/publish`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });

    const preview = await app.inject({ method: "GET", url: `/api/v1/lily/public/surveys/${createdSurvey.publicToken}/preview` });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().survey).toMatchObject({ title: "Pesquisa de teste público", estimatedMinutes: 4, questionCount: 1, points: 50 });
    expect(JSON.stringify(preview.json())).not.toContain(createdSurvey.id);
    expect(preview.json().survey).not.toHaveProperty("questions");
    expect(preview.headers["cache-control"]).toContain("no-store");
    const available = await app.inject({ method: "GET", url: "/api/v1/lily/surveys", headers: { cookie: customer.cookie } });
    expect(available.json().surveys[0].id).toBe(createdSurvey.publicToken);
    expect(available.json().surveys[0].id).not.toBe(createdSurvey.id);
    const started = await app.inject({ method: "POST", url: `/api/v1/lily/surveys/${createdSurvey.publicToken}/start`, headers: { origin, cookie: customer.cookie, "x-lily-csrf": customer.csrf }, payload: {} });
    expect(started.statusCode).toBe(200);
    expect(started.json().survey.title).toBe("Pesquisa de teste público");
  });

  it("requires pause before edit, lets existing responses finish, and resumes with a new version", async () => {
    const staff = await register("staff", "67911112221");
    const customer = await register("customer", "67911112222");
    const survey = await createSurvey(staff.cookie, staff.csrf, "Pesquisa publicada");
    await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/publish`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    const participation = await lilyPrisma.lilySurveyParticipation.create({ data: { userId: customer.userId, surveyId: survey.id, surveyVersion: survey.version } });

    const blockedEdit = await app.inject({ method: "PUT", url: `/api/v1/lily/admin/surveys/${survey.id}`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: definition("Alterada") });
    expect(blockedEdit.statusCode).toBe(409);
    expect(blockedEdit.json().error).toContain("pause-a primeiro");

    const paused = await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/pause`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    expect(paused.statusCode).toBe(200);
    expect(paused.json().survey.status).toBe("paused");
    const waiting = await app.inject({ method: "PUT", url: `/api/v1/lily/admin/surveys/${survey.id}`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: definition("Alterada") });
    expect(waiting.statusCode).toBe(409);
    expect(waiting.json().error).toContain("1 resposta(s) em andamento");

    const submitted = await app.inject({ method: "POST", url: `/api/v1/lily/surveys/${survey.id}/submit`, headers: { cookie: customer.cookie, "x-lily-csrf": customer.csrf, origin }, payload: { participationId: participation.id, answers: { q1: "Resposta" }, consentToLinkAnswers: false } });
    expect(submitted.statusCode).toBe(200);
    const edited = await app.inject({ method: "PUT", url: `/api/v1/lily/admin/surveys/${survey.id}`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: definition("Alterada") });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().survey.status).toBe("paused");
    expect(edited.json().survey.version).toBe(survey.version + 1);

    const resumed = await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/resume`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().survey.status).toBe("published");
    expect(await lilyPrisma.lilySurveyResponse.count({ where: { surveyId: survey.id } })).toBe(1);
  });

  it("excludes a logically deleted survey and cancels active participation without deleting history", async () => {
    const staff = await register("staff", "67911113331");
    const customer = await register("customer", "67911113332");
    const survey = await createSurvey(staff.cookie, staff.csrf, "Pesquisa para excluir");
    await app.inject({ method: "POST", url: `/api/v1/lily/admin/surveys/${survey.id}/publish`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin }, payload: {} });
    const participation = await lilyPrisma.lilySurveyParticipation.create({ data: { userId: customer.userId, surveyId: survey.id, surveyVersion: survey.version } });
    await lilyPrisma.lilySurveyResponse.create({ data: { surveyId: survey.id, surveyVersion: survey.version, answersJson: "{}" } });

    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/lily/admin/surveys/${survey.id}`, headers: { cookie: staff.cookie, "x-lily-csrf": staff.csrf, origin } });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().survey.status).toBe("cancelled");
    expect((await lilyPrisma.lilySurveyParticipation.findUniqueOrThrow({ where: { id: participation.id } })).status).toBe("cancelled");
    expect(await lilyPrisma.lilySurveyResponse.count({ where: { surveyId: survey.id } })).toBe(1);
    const visible = await app.inject({ method: "GET", url: "/api/v1/lily/surveys", headers: { cookie: customer.cookie } });
    expect(visible.json().surveys).toHaveLength(0);
  });
});
