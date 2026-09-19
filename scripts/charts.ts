import { type BrowserContext } from 'playwright';
import { runDailyArtistCharts } from './charts/daily-artist-charts.ts';
import { runDailySongCharts } from './charts/daily-song-charts.ts';
import { launchSpotifyChartsContext } from './auth.ts';

async function main() {
  const context: BrowserContext = await launchSpotifyChartsContext();
  try {
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