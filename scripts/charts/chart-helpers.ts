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

function normalizeSortableDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2];
    const day = isoMatch[3];
    if (!year || !month || !day) return undefined;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const month = usMatch[1];
    const day = usMatch[2];
    const year = usMatch[3];
    if (!month || !day || !year) return undefined;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

export function findGlobalChartDate(
  responses: Array<{ url: string; updatedDate?: string }>,
  chartUrlPattern: RegExp
): string | undefined {
  const latestDate = responses
    .filter((response) => {
      const match = response.url.match(chartUrlPattern);
      return match?.[1]?.toUpperCase() === 'GLOBAL';
    })
    .map((response) => response.updatedDate)
    .filter((updatedDate): updatedDate is string => typeof updatedDate === 'string' && updatedDate.trim().length > 0)
    .map((updatedDate) => normalizeSortableDate(updatedDate))
    .filter((updatedDate): updatedDate is string => !!updatedDate)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);

  return latestDate;
}
