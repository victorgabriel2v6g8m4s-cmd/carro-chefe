export function moneyInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function parseMoney(input: string) {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}
