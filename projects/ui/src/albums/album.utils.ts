import { NumericLike } from './album.config';

export function toNumber(value: NumericLike): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
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