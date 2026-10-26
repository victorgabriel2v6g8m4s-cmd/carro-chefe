type PriceDisplayProps = {
  currentPriceCents: number;
  compareAtPriceCents?: number | null;
  density?: "compact" | "comfortable";
  className?: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function PriceDisplay({ currentPriceCents, compareAtPriceCents, density = "comfortable", className = "" }: PriceDisplayProps) {
  const hasDiscount = compareAtPriceCents != null && compareAtPriceCents > currentPriceCents;
  return <span
    className={`price-display ${density === "compact" ? "is-compact" : ""} ${hasDiscount ? "is-promotional" : ""} ${className}`.trim()}
    aria-label={hasDiscount
      ? `De ${money(compareAtPriceCents!)} por ${money(currentPriceCents)}`
      : money(currentPriceCents)}
  >
    {hasDiscount && <del>{money(compareAtPriceCents!)}</del>}
    <strong>{money(currentPriceCents)}</strong>
  </span>;
}
