export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits;

  return national.length === 10 ? `+91${national}` : value.trim();
}

export function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  return `${local.slice(0, 2)}${"•".repeat(Math.min(5, Math.max(2, local.length - 2)))}@${domain}`;
}

export function maskPhone(value: string) {
  return value.length >= 4 ? `••••••${value.slice(-4)}` : value;
}
