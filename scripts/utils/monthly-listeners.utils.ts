import { chromium, type Response } from 'playwright';

const ARTIST_URL = 'https://open.spotify.com/artist/4iHNK0tOyZPYnBU7nGAgpQ';
const ARTIST_LOAD_DELAY = Number(process.env.SPOTIFY_ARTIST_LOAD_DELAY_MS ?? '5000');
const NAVIGATION_TIMEOUT = Number(process.env.SPOTIFY_NAVIGATION_TIMEOUT_MS ?? '90000');
const ACTION_TIMEOUT = Number(process.env.SPOTIFY_ACTION_TIMEOUT_MS ?? '30000');
const IS_CI = process.env.CI === 'true';
const HEADLESS = process.env.SPOTIFY_HEADLESS
  ? process.env.SPOTIFY_HEADLESS !== 'false'
  : true;

export function getMonthlyListeners(contents: any[]): number | null {
  for (const item of contents) {
    const monthlyListeners = item?.data?.artistUnion?.stats?.monthlyListeners;
    if (typeof monthlyListeners === 'number' && Number.isFinite(monthlyListeners)) {
      return monthlyListeners;
    }
  }
  return null;
}

export async function fetchMonthlyListeners(): Promise<number> {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: IS_CI
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : []
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const queryResponses: Response[] = [];

  page.setDefaultTimeout(ACTION_TIMEOUT);
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  page.on('response', (response) => {
    if (response.url().includes('/query')) {
      queryResponses.push(response);
    }
  });

  try {
    await page.goto(ARTIST_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(ARTIST_LOAD_DELAY);

    for (const response of queryResponses.reverse()) {
      try {
        const monthlyListeners = getMonthlyListeners([await response.json()]);
        if (monthlyListeners !== null) {
          return monthlyListeners;
        }
      } catch {
        // Ignore query responses that are not JSON or do not contain artist stats.
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  throw new Error('Monthly listeners were not found in the Spotify response');
}