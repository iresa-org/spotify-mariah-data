export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return undefined;
}

export function findString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return undefined;
}

export function findNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = number(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.toUpperCase() === 'GLOBAL' ? 'global' : countryCode.toUpperCase();
}

export function findGlobalChartDate(
  responses: Array<{ url: string; updatedDate?: string }>,
  chartUrlPattern: RegExp
): string | undefined {
  const globalResponse = responses.find((response) => {
    const match = response.url.match(chartUrlPattern);
    return match?.[1]?.toUpperCase() === 'GLOBAL';
  });

  return globalResponse?.updatedDate;
}
