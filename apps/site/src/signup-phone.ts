function normalizePhoneForValidation(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
}

export function isValidPhone(value: string) {
  const national = normalizePhoneForValidation(value);
  if (national.length !== 10 && national.length !== 11) return false;
  if (/^(\d)\1+$/.test(national)) return false;
  if (national.startsWith("0") || national.slice(2).startsWith("0")) return false;
  return national.length !== 11 || national[2] === "9";
}

export function formatPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
