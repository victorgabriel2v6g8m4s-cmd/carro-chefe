import { z } from "zod";

export const missionAudienceSchema = z.object({
  mode: z.enum(["all", "standard", "vip", "manual"]).default("all"),
  levels: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  users: z.array(z.string().trim().min(1).max(80)).max(500).default([]),
  rules: z.array(z.object({
    operator: z.enum(["and", "or", "except"]),
    field: z.enum(["class", "level", "user"]),
    value: z.string().trim().min(1).max(80)
  }).strict()).max(100).default([])
}).strict();

export type MissionAudience = z.infer<typeof missionAudienceSchema>;

export function missionAudienceMatches(audienceInput: unknown, facts: { userId: string; isVip: boolean; levelId: string | null }) {
  const audience = missionAudienceSchema.parse(audienceInput);
  const base = audience.mode === "all"
    || audience.mode === "vip" && facts.isVip
    || audience.mode === "standard" && !facts.isVip
    || audience.mode === "manual" && audience.users.includes(facts.userId);
  const levelMatches = !audience.levels.length || facts.levelId !== null && audience.levels.includes(facts.levelId);
  let matches = base && levelMatches;
  for (const rule of audience.rules) {
    const criterion = rule.field === "class"
      ? rule.value === "vip" ? facts.isVip : rule.value === "standard" ? !facts.isVip : false
      : rule.field === "level" ? facts.levelId === rule.value : facts.userId === rule.value;
    if (rule.operator === "or") matches = matches || criterion;
    else if (rule.operator === "except") matches = matches && !criterion;
    else matches = matches && criterion;
  }
  return matches;
}
