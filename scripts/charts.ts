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

function getExpectedLatestChartDate(referenceDate: Date = new Date()): string {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

async function getLatestStoredChartDate(chartType: ChartType): Promise<string | undefined> {
  const filePath = path.join(process.cwd(), 'charts', CHART_FILES[chartType]);

  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as { updatedDate?: unknown };
    const date = typeof parsed.updatedDate === 'string' ? parsed.updatedDate.trim() : undefined;
    if (date) return date;
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
    const publishedDate = chartType === 'song'
      ? (await fetchLatestDailySongChartDate(page))?.trim()
      : (await fetchLatestDailyArtistChartDate(page))?.trim();

    const storedDate = await getLatestStoredChartDate(chartType);
    const expectedLatestDate = getExpectedLatestChartDate();

    if (!storedDate) {
      console.log(`No saved ${chartType} chart date found. Proceeding with the next scan.`);
      return { needsUpdate: true, publishedDate };
    }

    if (!publishedDate) {
      console.warn(`Spotify ${chartType} chart did not publish an updatedDate. Will retry later.`);
      return { needsUpdate: false, publishedDate: undefined };
    }

    if (publishedDate !== expectedLatestDate) {
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

async function waitForNewChartDate(context: BrowserContext): Promise<void> {
  const seenLatestDates = new Map<ChartType, string>();

  while (true) {
    const expectedDate = getExpectedLatestChartDate();
    const songLatest =
      seenLatestDates.get('song') === expectedDate ||
      publishedDateMatchesExpected((await getLatestStoredChartDate('song')) ?? '');
    const artistLatest =
      seenLatestDates.get('artist') === expectedDate ||
      publishedDateMatchesExpected((await getLatestStoredChartDate('artist')) ?? '');

    if (songLatest && artistLatest) {
      console.log('Both song and artist charts have the latest update. Starting chart scan.');
      return;
    }

    const chartTypesToCheck: ChartType[] = [];
    if (!songLatest) chartTypesToCheck.push('song');
    if (!artistLatest) chartTypesToCheck.push('artist');

    for (const chartType of chartTypesToCheck) {
      const result = await checkChartUpdate(context, chartType);
      if (result.publishedDate === expectedDate) {
        seenLatestDates.set(chartType, expectedDate);
      }
    }

    const nextCheckType = chartTypesToCheck[0] ?? 'song';
    console.log(
      `Waiting for the remaining chart update. Next check: ${nextCheckType}. Re-checking in ${Math.round(POLL_INTERVAL_MS / 1000)} seconds.`
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

function publishedDateMatchesExpected(date: string): boolean {
  return date === getExpectedLatestChartDate();
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