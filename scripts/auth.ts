import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from 'playwright';

const CHARTS_URL = 'https://charts.spotify.com/charts/view/regional-global-daily/latest';
const CHART_REQUEST_URL = 'https://charts-spotify-com-service.spotify.com/auth/v0/charts/regional-global-daily/latest';
const AUTH_DIR = process.env.SPOTIFY_CHARTS_AUTH_DIR ?? path.join(process.cwd(), 'auth', 'spotify-charts');
const STORAGE_STATE = process.env.SPOTIFY_CHARTS_STORAGE_STATE;
const STORAGE_STATE_PATH = process.env.SPOTIFY_CHARTS_STORAGE_STATE_PATH;
const LOGIN_TIMEOUT_MS = Number(process.env.SPOTIFY_CHARTS_LOGIN_TIMEOUT_MS ?? '120000');
const AUTH_VERIFY_TIMEOUT_MS = Number(process.env.SPOTIFY_CHARTS_AUTH_VERIFY_TIMEOUT_MS ?? '30000');
const HEADLESS = process.env.SPOTIFY_CHARTS_HEADLESS
  ? process.env.SPOTIFY_CHARTS_HEADLESS !== 'false'
  : process.env.CI === 'true';
type SpotifyChartsStorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export async function launchSpotifyChartsContext(): Promise<BrowserContext> {
  await mkdir(AUTH_DIR, { recursive: true });

  let storageState: string | SpotifyChartsStorageState | undefined = STORAGE_STATE_PATH;
  if (STORAGE_STATE?.trim()) {
    try {
      storageState = JSON.parse(STORAGE_STATE) as SpotifyChartsStorageState;
    } catch {
      throw new Error('SPOTIFY_CHARTS_STORAGE_STATE must contain valid JSON.');
    }
  }

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: HEADLESS,
    viewport: { width: 1440, height: 1000 },
    args: process.env.CI === 'true' ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    ...(storageState ? { storageState } : {})
  });

  if (process.env.CI === 'true') {
    const cookieNames = (await context.cookies('https://charts.spotify.com'))
      .map((cookie) => cookie.name)
      .filter((name) => ['sp_dc', 'sp_key', 'sp_t'].includes(name));
    console.log(`Loaded Spotify auth cookies in CI: ${cookieNames.join(', ') || 'none'}`);
  }

  return context;
}

export async function waitForManualSpotifyLogin(page: Page): Promise<void> {
  console.log(`Log in to Spotify Charts in the browser window. The browser will remain open for ${LOGIN_TIMEOUT_MS / 1000} seconds.`);
  await page.waitForTimeout(LOGIN_TIMEOUT_MS);

  const countryResponse = page.waitForResponse(
    (response) => response.url().startsWith(CHART_REQUEST_URL),
    { timeout: AUTH_VERIFY_TIMEOUT_MS }
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  const response = await countryResponse;

  if (!response.ok()) {
    throw new Error(`Spotify Charts login was not accepted: countries endpoint returned HTTP ${response.status()}.`);
  }

  console.log(`Spotify Charts auth session is stored in ${AUTH_DIR}`);
}

export async function authenticateSpotifyCharts(): Promise<void> {
  const context = await launchSpotifyChartsContext();
  const page = await context.newPage();

  try {
    await page.goto(CHARTS_URL, { waitUntil: 'domcontentloaded' });
    await waitForManualSpotifyLogin(page);
  } finally {
    await context.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  authenticateSpotifyCharts().catch((error: unknown) => {
    console.error('Spotify Charts login failed:', error);
    process.exitCode = 1;
  });
}