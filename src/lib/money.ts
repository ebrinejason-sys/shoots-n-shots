// Currencies with a zero exponent have no minor unit; everything else uses two.
const EXPONENTS: Record<string, number> = {
  UGX: 0,
  TZS: 0,
  RWF: 0,
  NGN: 2,
  KES: 2,
  GHS: 2,
  ZAR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export function currencyExponent(currency: string): number {
  return EXPONENTS[currency.trim().toUpperCase()] ?? 2;
}

export function minorToMajor(minor: number, currency: string): number {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return minor;
  return Number((minor / 10 ** exponent).toFixed(exponent));
}

export function majorToMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyExponent(currency));
}

export function computeAmount(unitPriceMinor: number, quantity: number): number {
  return unitPriceMinor * quantity;
}

export function formatMoney(amountMinor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  const value = minorToMajor(amountMinor, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(value);
  return `${formatted} ${currency.trim().toUpperCase()}`;
}
