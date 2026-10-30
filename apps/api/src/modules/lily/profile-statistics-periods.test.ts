import { describe, expect, it } from "vitest";
import { buildWeeklyLoyaltyStats } from "./profile-statistics-periods";

describe("buildWeeklyLoyaltyStats", () => {
  it("returns seven rolling UTC days and aggregates each loyalty category", () => {
    const now = new Date("2026-10-30T12:00:00.000Z");
    const stats = buildWeeklyLoyaltyStats({
      now,
      events: [
        { type: "mission_reward", createdAt: new Date("2026-10-30T09:00:00.000Z") },
        { type: "activity_login", createdAt: new Date("2026-10-29T09:00:00.000Z") }
      ],
      orders: [{ createdAt: new Date("2026-10-28T09:00:00.000Z") }],
      surveys: [{ completedAt: new Date("2026-10-27T09:00:00.000Z") }],
      referrals: [{ creditedAt: new Date("2026-10-26T09:00:00.000Z") }]
    });

    expect(stats).toHaveLength(7);
    expect(stats[0]?.key).toBe("2026-10-24");
    expect(stats[6]).toMatchObject({ key: "2026-10-30", missions: 1, activity: 1 });
    expect(stats.find((day) => day.key === "2026-10-28")?.orders).toBe(1);
    expect(stats.find((day) => day.key === "2026-10-27")?.surveys).toBe(1);
    expect(stats.find((day) => day.key === "2026-10-26")?.referrals).toBe(1);
    expect(stats.find((day) => day.key === "2026-10-29")?.activity).toBe(1);
  });
});
