import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, type Page, type Response } from 'playwright';
import { launchSpotifyChartsContext } from '../auth.ts';
import { withChartNavigationLock } from './navigation.ts';

const ARTIST_CHART_URL = 'https://charts.spotify.com/charts/view/artist-global-daily/latest';
const ARTIST_CHART_REQUEST_URL_PREFIX = 'https://charts-spotify-com-service.spotify.com/auth/v0/charts/artist-';
const REGIONAL_ARTIST_CHART_URL_PREFIX = 'https://charts.spotify.com/charts/view/artist-';
const MODULE_NAME = path.basename(fileURLToPath(import.meta.url), path.extname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = path.join(process.cwd(), 'charts', `${MODULE_NAME}.json`);
const SETTLE_DELAY_MS = Number(process.env.SPOTIFY_CHARTS_SETTLE_MS ?? '10000');
const MARIAH_CAREY = 'mariah carey';
const LOAD_TIMEOUT_MS = Number(process.env.SPOTIFY_CHARTS_LOAD_TIMEOUT_MS ?? '60000');

export interface DailyArtistChartEntry {
  rank: number;
  name: string;
  uri?: string;
  imageUri?: string;
  previousRank?: number;
  peakRank?: number;
  appearancesOnChart?: number;
  consecutiveAppearancesOnChart?: number;
}

export interface DailyArtistCharts {
  updatedDate?: string;
  countries: Record<string, DailyArtistChart>;
}

export interface DailyArtistChart {
  updatedDate?: string;
  entries: DailyArtistChartEntry[];
}

interface CapturedResponse {
  url: string;
  body: unknown;
  updatedDate?: string;
}

interface ResponseCapture {
  responses: CapturedResponse[];
  countries: Set<string>;
  pending: Promise<void>[];
  statuses: Map<string, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return undefined;
}

function findString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return undefined;
}

function findNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = number(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeCountryCode(countryCode: string): string {
  return countryCode.toUpperCase() === 'GLOBAL' ? 'global' : countryCode.toUpperCase();
}

function getChartUrl(countryCode: string): string {
  return countryCode.toUpperCase() === 'GLOBAL'
    ? ARTIST_CHART_URL
    : `${REGIONAL_ARTIST_CHART_URL_PREFIX}${countryCode.toLowerCase()}-daily/latest`;
}

function collectCountryFilters(body: unknown, countries: Set<string>) {
  if (!isRecord(body) || !Array.isArray(body.chartNavigationFilters)) return;

  for (const filter of body.chartNavigationFilters) {
    if (!isRecord(filter) || filter.dimension !== 'Region' || !Array.isArray(filter.chartNavigationFilterEntries)) {
      continue;
    }

    for (const entry of filter.chartNavigationFilterEntries) {
      if (!isRecord(entry)) continue;
      const alias = text(entry.alias);
      const match = alias?.match(/^ARTIST_([A-Z]+)_DAILY$/i);
      if (match?.[1]) countries.add(match[1]);
    }
  }
}

function getUpdatedDate(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const displayChart = isRecord(body.displayChart) ? body.displayChart : undefined;
  const chartMetadata = displayChart && isRecord(displayChart.chartMetadata) ? displayChart.chartMetadata : undefined;
  return findString(displayChart ?? {}, ['date']) ?? findString(chartMetadata ?? {}, ['latestDate']);
}

function extractEntries(body: unknown): DailyArtistChartEntry[] {
  if (!isRecord(body) || !Array.isArray(body.entries)) return [];

  return body.entries.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const metadata = isRecord(item.artistMetadata) ? item.artistMetadata : item;
    const chartData = isRecord(item.chartEntryData) ? item.chartEntryData : item;
    const name = findString(metadata, ['artistName', 'name']);
    if (!name) return [];

    const entry: DailyArtistChartEntry = {
      rank: findNumber(chartData, ['currentRank', 'rank', 'position', 'chartRank']) ?? index + 1,
      name
    };
    const uri = findString(metadata, ['artistUri', 'uri']);
    const imageUri = findString(metadata, ['displayImageUri', 'imageUri']);
    const previousRank = findNumber(chartData, ['previousRank']);
    const peakRank = findNumber(chartData, ['peakRank']);
    const appearancesOnChart = findNumber(chartData, ['appearancesOnChart']);
    const consecutiveAppearancesOnChart = findNumber(chartData, ['consecutiveAppearancesOnChart']);
    if (uri !== undefined) entry.uri = uri;
    if (imageUri !== undefined) entry.imageUri = imageUri;
    if (previousRank !== undefined) entry.previousRank = previousRank;
    if (peakRank !== undefined) entry.peakRank = peakRank;
    if (appearancesOnChart !== undefined) entry.appearancesOnChart = appearancesOnChart;
    if (consecutiveAppearancesOnChart !== undefined) entry.consecutiveAppearancesOnChart = consecutiveAppearancesOnChart;
    return [entry];
  }).slice(0, 200);
}

function collectResponses(page: Page): ResponseCapture {
  const capture: ResponseCapture = {
    responses: [],
    countries: new Set<string>(),
    pending: [],
    statuses: new Map<string, number>()
  };

  page.on('response', (response: Response) => {
    const task = (async () => {
      const url = response.url();
      const chartMatch = url.match(/\/artist-([a-z]+)-daily\/latest/i);
      if (url.startsWith(ARTIST_CHART_REQUEST_URL_PREFIX) && chartMatch?.[1]) {
        capture.statuses.set(normalizeCountryCode(chartMatch[1]), response.status());
      }

      const contentType = response.headers()['content-type'] ?? '';
      if (!chartMatch || !contentType.includes('json') || !url.startsWith(ARTIST_CHART_REQUEST_URL_PREFIX)) return;

      try {
        const body = JSON.parse(await response.text()) as unknown;
        const updatedDate = getUpdatedDate(body);
        capture.responses.push({ url, body, ...(updatedDate === undefined ? {} : { updatedDate }) });
        collectCountryFilters(body, capture.countries);
      } catch {
        // Ignore responses that are not readable JSON.
      }
    })();
    capture.pending.push(task);
  });

  return capture;
}

async function waitForResponses(capture: ResponseCapture) {
  await Promise.allSettled(capture.pending);
}

async function loadChartPage(page: Page, url: string, countryCode: string, capture: ResponseCapture) {
  const chartResponse = page.waitForResponse(
    (response) => response.url().startsWith(ARTIST_CHART_REQUEST_URL_PREFIX)
      && response.url().match(/\/artist-([a-z]+)-daily\/latest/i)?.[1]?.toUpperCase() === countryCode,
    { timeout: LOAD_TIMEOUT_MS }
  ).catch(() => undefined);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const response = await chartResponse;
  await page.waitForTimeout(SETTLE_DELAY_MS);
  await waitForResponses(capture);

  if (response?.status() !== 200) {
    console.warn(`${countryCode} artist chart request returned HTTP ${response?.status() ?? 'no response'}.`);
  }
}

export async function fetchDailyArtistCharts(page: Page): Promise<DailyArtistCharts> {
  const capture = collectResponses(page);
  await withChartNavigationLock(async () => {
    await loadChartPage(page, ARTIST_CHART_URL, 'GLOBAL', capture);
  });

  const countryCodes = [
    ...[...capture.countries].filter((country) => country.toUpperCase() !== 'GLOBAL')
  ];

  for (const countryCode of countryCodes) {
    await withChartNavigationLock(async () => {
      await loadChartPage(page, getChartUrl(countryCode), countryCode, capture);
    });

    const country = normalizeCountryCode(countryCode);
    const status = capture.statuses.get(country);
    if (status !== 200) console.warn(`Skipping ${country}: artist chart endpoint returned HTTP ${status ?? 'no response'}`);
  }

  const countries: Record<string, DailyArtistChart> = {};
  let updatedDate: string | undefined;
  for (const response of capture.responses) {
    const match = response.url.match(/\/artist-([a-z]+)-daily\/latest/i);
    if (!match?.[1]) continue;
    const country = normalizeCountryCode(match[1]);
    const entries = extractEntries(response.body);
    if (country === 'global' && response.updatedDate !== undefined) updatedDate = response.updatedDate;
    if (entries.length > (countries[country]?.entries.length ?? 0)) {
      countries[country] = { entries, ...(response.updatedDate === undefined ? {} : { updatedDate: response.updatedDate }) };
    }
  }

  if (!countries.global?.entries.length) {
    throw new Error('Global artist chart did not load any entries after all retry attempts.');
  }

  return { countries, ...(updatedDate === undefined ? {} : { updatedDate }) };
}

function hasMariahCarey(entry: DailyArtistChartEntry): boolean {
  return entry.name.toLowerCase() === MARIAH_CAREY;
}

export async function saveDailyArtistCharts(charts: DailyArtistCharts): Promise<void> {
  const countries: Record<string, DailyArtistChart> = {};

  for (const [country, chart] of Object.entries(charts.countries)) {
    const matches = chart.entries.filter(hasMariahCarey);
    console.log(`${country} artists: ${chart.entries.length} entries; Mariah Carey: ${matches.length > 0 ? 'yes' : 'no'}`);
    if (matches.length > 0) {
      countries[country] = {
        entries: matches,
        ...(chart.updatedDate === undefined ? {} : { updatedDate: chart.updatedDate })
      };
    }
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify({
    ...(charts.updatedDate === undefined ? {} : { updatedDate: charts.updatedDate }),
    countries
  }, null, 2)}\n`, 'utf8');
  console.log(`Saved Mariah Carey artist matches to ${OUTPUT_PATH}`);
}

async function initContext(context: BrowserContext) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(LOAD_TIMEOUT_MS);
  return page;
}

export async function runDailyArtistCharts(sharedContext?: BrowserContext): Promise<void> {
  const context: BrowserContext = sharedContext ?? await launchSpotifyChartsContext();
  try {
    const page = await initContext(context);
    const charts = await fetchDailyArtistCharts(page);
    await saveDailyArtistCharts(charts);
  } finally {
    if (!sharedContext) await context.close();
  }
}
