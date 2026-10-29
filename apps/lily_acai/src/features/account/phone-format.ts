export function formatBrazilianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;

  if (national.length === 11) {
    return "+55 (" + national.slice(0, 2) + ") " + national.slice(2, 7) + "-" + national.slice(7);
  }
  if (national.length === 10) {
    return "+55 (" + national.slice(0, 2) + ") " + national.slice(2, 6) + "-" + national.slice(6);
  }
  return input;
}

export function formatBrazilianPhoneInput(input: string, selectionStart: number | null) {
  const caret = Math.max(0, Math.min(selectionStart ?? input.length, input.length));
  const digitsBeforeCaret = input.slice(0, caret).replace(/\D/g, "").length;
  const value = formatBrazilianPhone(input);
  const digitsInValue = value.replace(/\D/g, "").length;
  if (value === input || digitsInValue !== input.replace(/\D/g, "").length) return { value, caret: Math.min(caret, value.length) };
  if (digitsBeforeCaret === 0) return { value, caret: 0 };
  let digitsSeen = 0; let nextCaret = value.length;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) digitsSeen += 1;
    if (digitsSeen === digitsBeforeCaret) { nextCaret = index + 1; break; }
  }
  return { value, caret: nextCaret };
}
