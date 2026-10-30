type DatedItem = { createdAt: Date };

type WeeklyStatsInput = {
  now: Date;
  events: Array<DatedItem & { type: string }>;
  orders: DatedItem[];
  surveys: Array<{ completedAt: Date | null }>;
  referrals: Array<{ creditedAt: Date | null }>;
};

const excludedFromActivity = new Set([
  "mission_reward",
  "survey_reward",
  "order_purchase",
  "order_refund",
  "referral_signup"
]);

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildWeeklyLoyaltyStats({ now, events, orders, surveys, referrals }: WeeklyStatsInput) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - 6 + index);
    return {
      key: utcDayKey(date),
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(date),
      missions: 0,
      activity: 0,
      surveys: 0,
      orders: 0,
      referrals: 0
    };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  const activeDays = new Set<string>();

  for (const event of events) {
    const day = byDay.get(utcDayKey(event.createdAt));
    if (!day) continue;
    if (event.type === "mission_reward") day.missions += 1;
    else if (!excludedFromActivity.has(event.type)) day.activity += 1;
    activeDays.add(day.key);
  }
  for (const order of orders) {
    const day = byDay.get(utcDayKey(order.createdAt));
    if (day) { day.orders += 1; activeDays.add(day.key); }
  }
  for (const survey of surveys) {
    if (!survey.completedAt) continue;
    const day = byDay.get(utcDayKey(survey.completedAt));
    if (day) { day.surveys += 1; activeDays.add(day.key); }
  }
  for (const referral of referrals) {
    if (!referral.creditedAt) continue;
    const day = byDay.get(utcDayKey(referral.creditedAt));
    if (day) { day.referrals += 1; activeDays.add(day.key); }
  }

  for (const day of days) day.activity = activeDays.has(day.key) ? 1 : 0;
  return days;
}
