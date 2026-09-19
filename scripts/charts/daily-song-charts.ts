import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, type Page, type Response } from 'playwright';
import { launchSpotifyChartsContext } from '../auth.ts';
import { withChartNavigationLock } from './navigation.ts';

const GLOBAL_CHART_URL = 'https://charts.spotify.com/charts/view/regional-global-daily/latest';
const CHART_REQUEST_URL_PREFIX = 'https://charts-spotify-com-service.spotify.com/auth/v0/charts/regional-';
const REGIONAL_CHART_URL_PREFIX = 'https://charts.spotify.com/charts/view/regional-';
const MODULE_NAME = path.basename(fileURLToPath(import.meta.url), path.extname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = path.join(process.cwd(), 'charts', `${MODULE_NAME}.json`);
const SETTLE_DELAY_MS = Number(process.env.SPOTIFY_CHARTS_SETTLE_MS ?? '10000');
const MARIAH_CAREY = 'mariah carey';
const LOAD_TIMEOUT_MS = Number(process.env.SPOTIFY_CHARTS_LOAD_TIMEOUT_MS ?? '60000');

export interface DailySongChartEntry {
  rank: number;
  name: string;
  artists?: string[];
  streams?: number;
  uri?: string;
}

export interface DailySongCharts {
  updatedDate?: string;
  countries: Record<string, DailySongChart>;
}

export interface DailySongChart {
  updatedDate?: string;
  entries: DailySongChartEntry[];
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
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
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
    ? GLOBAL_CHART_URL
    : `${REGIONAL_CHART_URL_PREFIX}${countryCode.toLowerCase()}-daily/latest`;
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
      const match = alias?.match(/^REGIONAL_([A-Z]+)_DAILY$/i);
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

function getArtists(record: Record<string, unknown>): string[] {
  const value = record.artists;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (!isRecord(item)) return [];
    const name = findString(item, ['name', 'artistName', 'profileName']);
    return name ? [name] : [];
  });
}

function extractEntries(body: unknown): DailySongChartEntry[] {
  if (!isRecord(body) || !Array.isArray(body.entries)) return [];

  return body.entries.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const metadata = isRecord(item.trackMetadata) ? item.trackMetadata : item;
    const chartData = isRecord(item.chartEntryData) ? item.chartEntryData : item;
    const name = findString(metadata, ['trackName', 'name', 'title']);
    if (!name) return [];
    const rankingMetric = isRecord(chartData.rankingMetric) ? chartData.rankingMetric : chartData;
    const streams = findNumber(rankingMetric, ['value', 'streams', 'streamCount', 'playCount']);
    const uri = findString(metadata, ['trackUri', 'uri']);
    return [{
      rank: findNumber(chartData, ['currentRank', 'rank', 'position', 'chartRank']) ?? index + 1,
      name,
      artists: getArtists(metadata),
      ...(streams === undefined ? {} : { streams }),
      ...(uri === undefined ? {} : { uri })
    }];
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
      const chartMatch = url.match(/\/regional-([a-z]+)-daily\/latest/i);
      if (url.startsWith(CHART_REQUEST_URL_PREFIX) && chartMatch?.[1]) {
        capture.statuses.set(normalizeCountryCode(chartMatch[1]), response.status());
      }

      const contentType = response.headers()['content-type'] ?? '';
      if (!chartMatch || !contentType.includes('json') || !url.startsWith(CHART_REQUEST_URL_PREFIX)) return;

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
    (response) => response.url().startsWith(CHART_REQUEST_URL_PREFIX)
      && response.url().match(/\/regional-([a-z]+)-daily\/latest/i)?.[1]?.toUpperCase() === countryCode,
    { timeout: LOAD_TIMEOUT_MS }
  ).catch(() => undefined);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const response = await chartResponse;
  await page.waitForTimeout(SETTLE_DELAY_MS);
  await waitForResponses(capture);

  if (response?.status() !== 200) {
    console.warn(`${countryCode} chart request returned HTTP ${response?.status() ?? 'no response'}.`);
    if (response && response.status() === 401) {
      console.warn(`Spotify returned: ${(await response.text()).slice(0, 200)}`);
    }
  }
}

export async function fetchDailySongCharts(page: Page): Promise<DailySongCharts> {
  const capture = collectResponses(page);
  await withChartNavigationLock(async () => {
    await loadChartPage(page, GLOBAL_CHART_URL, 'GLOBAL', capture);
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
    if (status !== 200) console.warn(`Skipping ${country}: chart endpoint returned HTTP ${status ?? 'no response'}`);
  }

  const countries: Record<string, DailySongChart> = {};
  let updatedDate: string | undefined;
  for (const response of capture.responses) {
    const match = response.url.match(/\/regional-([a-z]+)-daily\/latest/i);
    if (!match?.[1]) continue;
    const country = normalizeCountryCode(match[1]);
    const entries = extractEntries(response.body);
    if (country === 'global' && response.updatedDate !== undefined) updatedDate = response.updatedDate;
    if (entries.length > (countries[country]?.entries.length ?? 0)) {
      countries[country] = { entries, ...(response.updatedDate === undefined ? {} : { updatedDate: response.updatedDate }) };
    }
  }

  if (!countries.global?.entries.length) {
    throw new Error('Global song chart did not load any entries after all retry attempts.');
  }

  return { countries, ...(updatedDate === undefined ? {} : { updatedDate }) };
}

function hasMariahCarey(entry: DailySongChartEntry): boolean {
  return [entry.name, ...(entry.artists ?? [])].some((value) => value.toLowerCase() === MARIAH_CAREY);
}

export async function saveDailySongCharts(charts: DailySongCharts): Promise<void> {
  const countries: Record<string, DailySongChart> = {};

  for (const [country, chart] of Object.entries(charts.countries)) {
    const matches = chart.entries.filter(hasMariahCarey);
    console.log(`${country} songs: ${chart.entries.length} entries; Mariah Carey: ${matches.length > 0 ? 'yes' : 'no'}`);
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
  console.log(`Saved Mariah Carey chart matches to ${OUTPUT_PATH}`);
}

async function initContext(context: BrowserContext) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(LOAD_TIMEOUT_MS);
  return page;
}

export async function runDailySongCharts(sharedContext?: BrowserContext): Promise<void> {
  const context: BrowserContext = sharedContext ?? await launchSpotifyChartsContext();
  try {
    const page = await initContext(context);
    const charts = await fetchDailySongCharts(page);
    await saveDailySongCharts(charts);
  } finally {
    if (!sharedContext) await context.close();
  }
}