import { describe, expect, it } from 'vitest';
import { formatCompact, formatSignedCompact, toNumber } from './number.utils';

describe('number formatting utilities', () => {
  it('parses comma-grouped numbers', () => {
    expect(toNumber('1,234')).toBe(1234);
    expect(toNumber('-1,234.5')).toBe(-1234.5);
    expect(toNumber('1,23')).toBe(0);
  });

  it('formats numbers above three digits compactly', () => {
    expect(formatCompact(1234)).toBe('1.23K');
    expect(formatCompact('1,234')).toBe('1.23K');
    expect(formatCompact('1,234,567')).toBe('1.23M');
  });

  it('preserves the sign when formatting grouped numbers', () => {
    expect(formatSignedCompact('-1,234')).toBe('-1.23K');
    expect(formatSignedCompact('1,234')).toBe('+1.23K');
  });
});
