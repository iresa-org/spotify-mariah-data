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

async function checkChartUpdate(context: BrowserContext, chartType: ChartType): Promise<boolean> {
  const page = await context.newPage();
  try {
    const publishedDate = chartType === 'song'
      ? (await fetchLatestDailySongChartDate(page))?.trim()
      : (await fetchLatestDailyArtistChartDate(page))?.trim();

    const storedDate = await getLatestStoredChartDate(chartType);

    if (!storedDate) {
      console.log(`No saved ${chartType} chart date found. Proceeding with the next scan.`);
      return true;
    }

    if (!publishedDate) {
      console.warn(`Spotify ${chartType} chart did not publish an updatedDate. Will retry later.`);
      return false;
    }

    if (publishedDate !== storedDate) {
      console.log(`New ${chartType} chart update published on ${publishedDate}.`);
      return true;
    }

    console.log(`Latest ${chartType} chart date is still ${publishedDate}; waiting for a new update.`);
    return false;
  } catch (error) {
    console.warn(`Unable to verify the latest ${chartType} chart date. Retrying later.`, error);
    return false;
  } finally {
    await page.close();
  }
}

async function waitForNewChartDate(context: BrowserContext): Promise<void> {
  while (true) {
    const songNeedsUpdate = await checkChartUpdate(context, 'song');
    const artistNeedsUpdate = await checkChartUpdate(context, 'artist');

    if (songNeedsUpdate || artistNeedsUpdate) {
      console.log('A new chart update is available. Starting chart scan.');
      return;
    }

    console.log(
      `No new chart update detected. Checking again in ${Math.round(POLL_INTERVAL_MS / 1000)} seconds.`
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
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