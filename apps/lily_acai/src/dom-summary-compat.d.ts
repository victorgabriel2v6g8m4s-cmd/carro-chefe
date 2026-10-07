// Compatibilidade de tipagem para o elemento <summary> no lib.dom usado pelo build CookLily.
// Em runtime o elemento é um HTMLElement; esta interface apenas torna explícita essa relação
// para o querySelectorAll tipado do painel administrativo de capas por sabor.
interface HTMLSummaryElement extends HTMLElement {}
