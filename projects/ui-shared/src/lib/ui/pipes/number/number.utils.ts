export type NumericLike = number | string;

export function toNumber(value: NumericLike): number {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  if (typeof value !== 'string') return 0;

  const groupedNumber = value.trim();
  if (!/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(groupedNumber)) return 0;

  return Number(groupedNumber.replaceAll(',', ''));
}

export function formatCompact(value: NumericLike): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(toNumber(value));
}

export function formatSignedCompact(value: NumericLike): string {
  const numericValue = toNumber(value);
  const compact = formatCompact(Math.abs(numericValue));
  if (numericValue < 0) return `-${compact}`;
  if (numericValue > 0) return `+${compact}`;
  return compact;
}