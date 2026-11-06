import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { type BrowserContext } from 'playwright';
import { fetchLatestDailyArtistChartDate, runDailyArtistCharts } from './charts/daily-artist-charts.ts';
import { fetchLatestDailySongChartDate, runDailySongCharts } from './charts/daily-song-charts.ts';
import { launchSpotifyChartsContext } from './auth.ts';

const POLL_INTERVAL_MS = Number(process.env.SPOTIFY_CHARTS_POLL_INTERVAL_MS ?? '300000');
const CHART_FILES = {
  song: 'daily-song-charts.json',
  artist: 'daily-artist-charts.json'
} as const;

type ChartType = keyof typeof CHART_FILES;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeChartDate(date: Date | string | undefined, referenceDate: Date = new Date()): string | undefined {
  if (!date) return undefined;

  if (date instanceof Date) {
    return formatDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  const trimmed = date.trim();
  if (!trimmed) return undefined;

  const isoDateMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return formatDateKey(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  const slashDateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDateMatch) {
    const [, month, day, year] = slashDateMatch;
    return formatDateKey(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  const monthDayMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (monthDayMatch) {
    const [, month, day] = monthDayMatch;
    return formatDateKey(new Date(referenceDate.getFullYear(), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  return trimmed;
}

function getExpectedLatestChartDate(referenceDate: Date = new Date()): string {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return formatDateKey(date);
}

function getExpectedChartDates(referenceDate: Date = new Date()): string[] {
  return [getExpectedLatestChartDate(referenceDate)];
}

function isExpectedChartDate(date: string | undefined, referenceDate: Date = new Date()): boolean {
  const normalizedDate = normalizeChartDate(date, referenceDate);
  return normalizedDate !== undefined && getExpectedChartDates(referenceDate).includes(normalizedDate);
}

async function getLatestStoredChartDate(chartType: ChartType): Promise<string | undefined> {
  const filePath = path.join(process.cwd(), 'charts', CHART_FILES[chartType]);

  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as { updatedDate?: unknown };
    const date = typeof parsed.updatedDate === 'string' ? parsed.updatedDate.trim() : undefined;
    return normalizeChartDate(date);
  } catch {
    // Ignore missing or unreadable chart files during the initial startup check.
  }

  return undefined;
}

type ChartUpdateStatus = {
  needsUpdate: boolean;
  publishedDate: string | undefined;
};

async function checkChartUpdate(context: BrowserContext, chartType: ChartType): Promise<ChartUpdateStatus> {
  const page = await context.newPage();
  try {
    const publishedDate = normalizeChartDate(
      chartType === 'song'
        ? (await fetchLatestDailySongChartDate(page))?.trim()
        : (await fetchLatestDailyArtistChartDate(page))?.trim()
    );

    const storedDate = await getLatestStoredChartDate(chartType);
    const expectedLatestDate = storedDate
      ? getExpectedLatestChartDate(new Date(`${storedDate}T00:00:00`))
      : getExpectedLatestChartDate();

    if (!storedDate) {
      console.log(`No saved ${chartType} chart date found. Proceeding with the next scan.`);
      return { needsUpdate: true, publishedDate };
    }

    if (!publishedDate) {
      console.warn(`Spotify ${chartType} chart did not publish an updatedDate. Will retry later.`);
      return { needsUpdate: false, publishedDate: undefined };
    }

    if (!isExpectedChartDate(publishedDate)) {
      console.log(
        `Latest ${chartType} chart date is ${publishedDate}, but the expected update date is ${expectedLatestDate}; waiting for a new update.`
      );
      return { needsUpdate: false, publishedDate };
    }

    if (publishedDate !== storedDate) {
      console.log(`New ${chartType} chart updated date found: ${publishedDate} (expected latest date before today).`);
      return { needsUpdate: true, publishedDate };
    }

    console.log(`Latest ${chartType} chart date ${publishedDate} has already been scanned; waiting for the next update.`);
    return { needsUpdate: false, publishedDate };
  } catch (error) {
    console.warn(`Unable to verify the latest ${chartType} chart date. Retrying later.`, error);
    return { needsUpdate: false, publishedDate: undefined };
  } finally {
    await page.close();
  }
}

async function isChartReady(context: BrowserContext, chartType: ChartType): Promise<boolean> {
  const storedDate = await getLatestStoredChartDate(chartType);
  const expectedDate = storedDate
    ? getExpectedLatestChartDate(new Date(`${storedDate}T00:00:00`))
    : getExpectedLatestChartDate();

  if (storedDate === expectedDate || isExpectedChartDate(storedDate)) {
    console.log(`${chartType} chart already matches the expected latest date (${expectedDate}).`);
    return true;
  }

  const page = await context.newPage();
  try {
    const liveDate = normalizeChartDate(
      chartType === 'song'
        ? (await fetchLatestDailySongChartDate(page))?.trim()
        : (await fetchLatestDailyArtistChartDate(page))?.trim()
    );

    const ready = isExpectedChartDate(liveDate, new Date(`${storedDate ?? new Date().toISOString().slice(0, 10)}T00:00:00`));
    if (ready) {
      console.log(`Live ${chartType} chart date matches the expected latest date (${expectedDate}).`);
    }
    return ready;
  } finally {
    await page.close();
  }
}

async function waitForNewChartDate(context: BrowserContext): Promise<void> {
  while (true) {
    const songReady = await isChartReady(context, 'song');
    const artistReady = await isChartReady(context, 'artist');

    if (songReady && artistReady) {
      console.log('Both song and artist charts are ready. Starting chart scan.');
      return;
    }

    const nextCheckType = songReady ? 'artist' : 'song';
    console.log(
      `Waiting for the remaining chart update. Next check: ${nextCheckType}. Re-checking in ${Math.round(POLL_INTERVAL_MS / 1000)} seconds.`
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

function publishedDateMatchesExpected(date: string): boolean {
  return isExpectedChartDate(date);
}

async function main() {
  const context: BrowserContext = await launchSpotifyChartsContext();
  try {
    await waitForNewChartDate(context);
    await runDailySongCharts(context);
    await runDailyArtistCharts(context);
  } finally {
    await context.close();
  }
}

main().catch((error: unknown) => {
  console.error('Spotify Charts scrape failed:', error);
  process.exitCode = 1;
});