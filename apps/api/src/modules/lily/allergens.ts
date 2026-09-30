import { z } from "zod";

export const LILY_ALLERGEN_CATALOG = [
  { code: "wheat_rye_barley_oats", label: "trigo, centeio, cevada, aveia e suas estirpes hibridizadas" },
  { code: "crustaceans", label: "crustáceos" },
  { code: "eggs", label: "ovos" },
  { code: "fish", label: "peixes" },
  { code: "peanuts", label: "amendoim" },
  { code: "soy", label: "soja" },
  { code: "milk", label: "leite de todos os mamíferos" },
  { code: "almonds", label: "amêndoas" },
  { code: "hazelnuts", label: "avelãs" },
  { code: "cashews", label: "castanha-de-caju" },
  { code: "brazil_nuts", label: "castanha-do-pará" },
  { code: "macadamias", label: "macadâmias" },
  { code: "walnuts", label: "nozes" },
  { code: "pecans", label: "pecãs" },
  { code: "pistachios", label: "pistaches" },
  { code: "pine_nuts", label: "pinoli" },
  { code: "chestnuts", label: "castanhas" },
  { code: "natural_latex", label: "látex natural" }
] as const;

export type LilyAllergenCode = typeof LILY_ALLERGEN_CATALOG[number]["code"];
export type LilyAllergenReviewStatus = "unreviewed" | "reviewed";

const codes = LILY_ALLERGEN_CATALOG.map((item) => item.code) as [
  LilyAllergenCode,
  ...LilyAllergenCode[]
];

export const lilyAllergenCodeSchema = z.enum(codes);
export const lilyAllergenCodesSchema = z.array(lilyAllergenCodeSchema).max(LILY_ALLERGEN_CATALOG.length);

export const lilyAllergenInputSchema = z.object({
  allergenReviewStatus: z.enum(["unreviewed", "reviewed"]).default("unreviewed"),
  allergenContains: lilyAllergenCodesSchema.default([]),
  allergenMayContain: lilyAllergenCodesSchema.default([])
}).strict().superRefine((value, ctx) => {
  const overlap = new Set(value.allergenContains.filter((code) => value.allergenMayContain.includes(code)));
  if (overlap.size) {
    ctx.addIssue({
      code: "custom",
      message: "O mesmo alergênico não pode estar em CONTÉM e PODE CONTER."
    });
  }
});

const order = new Map<LilyAllergenCode, number>(
  LILY_ALLERGEN_CATALOG.map((item, index) => [item.code, index])
);
const labels = new Map<LilyAllergenCode, string>(
  LILY_ALLERGEN_CATALOG.map((item) => [item.code, item.label])
);

export function normalizeLilyAllergenCodes(values: Iterable<string>) {
  const valid = new Set<LilyAllergenCode>();
  for (const value of values) {
    const parsed = lilyAllergenCodeSchema.safeParse(value);
    if (parsed.success) valid.add(parsed.data);
  }
  return [...valid].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function parseLilyAllergenJson(input: string | null | undefined) {
  if (!input) return [] as LilyAllergenCode[];
  try {
    const value = JSON.parse(input);
    return Array.isArray(value) ? normalizeLilyAllergenCodes(value.filter((item): item is string => typeof item === "string")) : [];
  } catch {
    return [];
  }
}

export function serializeLilyAllergenCodes(values: Iterable<string>) {
  return JSON.stringify(normalizeLilyAllergenCodes(values));
}

export function describeLilyAllergenCodes(values: Iterable<string>) {
  return normalizeLilyAllergenCodes(values).map((code) => ({
    code,
    label: labels.get(code) ?? code
  }));
}

export type LilyAllergenSource = {
  label: string;
  reviewStatus: LilyAllergenReviewStatus | string;
  contains: Iterable<string>;
  mayContain: Iterable<string>;
};

export function aggregateLilyAllergens(sources: LilyAllergenSource[]) {
  const contains = new Set<LilyAllergenCode>();
  const mayContain = new Set<LilyAllergenCode>();
  const unreviewed: string[] = [];

  for (const source of sources) {
    if (source.reviewStatus !== "reviewed") unreviewed.push(source.label);
    for (const code of normalizeLilyAllergenCodes(source.contains)) contains.add(code);
    for (const code of normalizeLilyAllergenCodes(source.mayContain)) mayContain.add(code);
  }

  for (const code of contains) mayContain.delete(code);

  return {
    complete: unreviewed.length === 0,
    contains: describeLilyAllergenCodes(contains),
    mayContain: describeLilyAllergenCodes(mayContain),
    unreviewed: [...new Set(unreviewed)]
  };
}


export function mergeLilyAllergenSummaries(summaries: Array<{
  complete: boolean;
  contains: Array<{ code: string }>;
  mayContain: Array<{ code: string }>;
  unreviewed: string[];
}>) {
  const contains = summaries.flatMap((summary) => summary.contains.map((item) => item.code));
  const mayContain = summaries.flatMap((summary) => summary.mayContain.map((item) => item.code));
  const containsSet = new Set(normalizeLilyAllergenCodes(contains));
  const filteredMayContain = normalizeLilyAllergenCodes(mayContain).filter((code) => !containsSet.has(code));

  return {
    complete: summaries.every((summary) => summary.complete),
    contains: describeLilyAllergenCodes(containsSet),
    mayContain: describeLilyAllergenCodes(filteredMayContain),
    unreviewed: [...new Set(summaries.flatMap((summary) => summary.unreviewed))]
  };
}

export function allergenStorageData(input: z.infer<typeof lilyAllergenInputSchema>) {
  return {
    allergenReviewStatus: input.allergenReviewStatus,
    allergenContainsJson: serializeLilyAllergenCodes(input.allergenContains),
    allergenMayContainJson: serializeLilyAllergenCodes(input.allergenMayContain)
  };
}

export function allergenApiData(input: {
  allergenReviewStatus: string;
  allergenContainsJson: string;
  allergenMayContainJson: string;
}) {
  return {
    reviewStatus: input.allergenReviewStatus,
    contains: describeLilyAllergenCodes(parseLilyAllergenJson(input.allergenContainsJson)),
    mayContain: describeLilyAllergenCodes(parseLilyAllergenJson(input.allergenMayContainJson))
  };
}
