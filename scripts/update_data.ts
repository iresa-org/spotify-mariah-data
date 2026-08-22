import * as path from 'path';
import { mkdir } from 'fs/promises';
import { chromium, type Page } from 'playwright';
import { formatDate } from './utils/date.utils.ts';
import { clearFilesFromFolder } from './utils/file.utils.ts';

const PLAYLIST_URL = 'https://open.spotify.com/playlist/4W9ZFDZXQ5qxHzY6Lvtz2E?si=96fd5341d67e4e62&nd=1&dlsi=18b7dd86d16248b9';
const ARTIST_URL = 'https://open.spotify.com/artist/4iHNK0tOyZPYnBU7nGAgpQ';
const ARTIST_LOAD_DELAY = Number(process.env.SPOTIFY_ARTIST_LOAD_DELAY_MS ?? '5000');
const UPLOAD_DIR = path.join(process.cwd(), 'upload');
const SCROLL_STEP = Number(process.env.SPOTIFY_SCROLL_STEP ?? '1400');
const SCROLL_DELAY = Number(process.env.SPOTIFY_SCROLL_DELAY_MS ?? '700');
const MAX_SCROLLS = Number(process.env.SPOTIFY_MAX_SCROLLS ?? '2000');
const STABLE_LIMIT = Number(process.env.SPOTIFY_STABLE_LIMIT ?? '8');
const NAVIGATION_TIMEOUT = Number(process.env.SPOTIFY_NAVIGATION_TIMEOUT_MS ?? '90000');
const ACTION_TIMEOUT = Number(process.env.SPOTIFY_ACTION_TIMEOUT_MS ?? '30000');
const GOTO_RETRIES = Number(process.env.SPOTIFY_GOTO_RETRIES ?? '3');
const IS_CI = process.env.CI === 'true';
const HEADLESS = process.env.SPOTIFY_HEADLESS
  ? process.env.SPOTIFY_HEADLESS !== 'false'
  : true;

// Spotify renders the tracklist in a virtualised container, so the window itself never scrolls
const SCROLL_CONTAINER_SELECTOR = '.main-view-container__scroll-node';
const TRACK_ROW_SELECTORS = [
  '[data-testid="tracklist-row"]',
  '[role="group"]',
  'a[href^="/track/"]'
];

async function acceptCookies(page: Page) {
  const button = page.locator('#onetrust-accept-btn-handler');
  try {
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
  } catch {
    // Banner is not always shown
  }
}

async function gotoWithRetry(page: Page, url: string, attempts = GOTO_RETRIES) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Navigation failed (${attempt}/${attempts}) for ${url}`);

      if (attempt < attempts) {
        await page.waitForTimeout(1500 * attempt);
      }
    }
  }

  throw lastError;
}

async function scrollToBottom(page: Page) {
  const preferredTargetAvailable = await page.evaluate(
    ({ containerSelector }) => {
      const container = document.querySelector<HTMLElement>(containerSelector);
      return Boolean(container && container.scrollHeight > container.clientHeight + 10);
    },
    { containerSelector: SCROLL_CONTAINER_SELECTOR }
  );

  console.log(
    preferredTargetAvailable
      ? `Using preferred scroll container when available: ${SCROLL_CONTAINER_SELECTOR}`
      : 'Using dynamic scroll container detection fallback'
  );

  let stable = 0;
  let previousTop = -1;
  let previousHeight = -1;
  let previousRows = -1;

  // Ensure wheel events land on the content area.
  const viewport = page.viewportSize();
  if (viewport) {
    await page.mouse.move(Math.floor(viewport.width / 2), Math.floor(viewport.height / 2));
  }

  for (let i = 0; i < MAX_SCROLLS && stable < STABLE_LIMIT; i++) {
    await page.mouse.wheel(0, SCROLL_STEP);
    await page.waitForTimeout(SCROLL_DELAY);

    const metrics = await page.evaluate(
      ({ selector, step, rowSelectors }) => {
        const isScrollable = (el: HTMLElement) => {
          const style = getComputedStyle(el);
          const overflowY = style.overflowY;
          return /(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight + 1;
        };

        const describe = (el: HTMLElement | null) => {
          if (!el) {
            return 'document';
          }

          const idPart = el.id ? `#${el.id}` : '';
          const classPart = typeof el.className === 'string' && el.className.length > 0
            ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
            : '';

          return `${el.tagName.toLowerCase()}${idPart}${classPart}`;
        };

        const findActiveScrollable = () => {
          const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2) as HTMLElement | null;

          let node: HTMLElement | null = centerEl;
          while (node) {
            if (isScrollable(node)) {
              return node;
            }

            node = node.parentElement;
          }

          const preferred = document.querySelector<HTMLElement>(selector);
          if (preferred && preferred.scrollHeight > preferred.clientHeight + 1) {
            return preferred;
          }

          const candidates = Array.from(document.querySelectorAll<HTMLElement>('div,section,main'))
            .filter((el) => el.clientHeight > 100 && el.getBoundingClientRect().height > 100 && isScrollable(el))
            .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

          return candidates[0] ?? null;
        };

        const target = findActiveScrollable();

        if (target) {
          target.scrollBy(0, step);
        } else {
          window.scrollBy(0, step);
        }

        const docEl = document.scrollingElement ?? document.documentElement;
        const metricNode = target ?? null;
        const rowCounts = rowSelectors.map((selector: string) => document.querySelectorAll(selector).length);
        const rows = rowCounts.length > 0 ? Math.max(...rowCounts) : 0;

        const top = metricNode ? metricNode.scrollTop : Math.max(window.scrollY, docEl.scrollTop);
        const height = metricNode ? metricNode.scrollHeight : docEl.scrollHeight;
        const clientHeight = metricNode ? metricNode.clientHeight : window.innerHeight;

        return {
          top,
          height,
          clientHeight,
          rows,
          target: describe(metricNode)
        };
      },
      { selector: SCROLL_CONTAINER_SELECTOR, step: SCROLL_STEP, rowSelectors: TRACK_ROW_SELECTORS }
    );

    if (!metrics) {
      console.warn(`Scroll container "${SCROLL_CONTAINER_SELECTOR}" is no longer in the DOM`);
      break;
    }

    const didProgress =
      metrics.top !== previousTop || metrics.height !== previousHeight || metrics.rows !== previousRows;

    stable = didProgress ? 0 : stable + 1;
    previousTop = metrics.top;
    previousHeight = metrics.height;
    previousRows = metrics.rows;

    const atBottom = metrics.top + metrics.clientHeight >= metrics.height - 2;

    console.log(
      `Scroll ${i + 1}: offset ${metrics.top}/${metrics.height} (${metrics.rows} rows loaded, target ${metrics.target}, bottom=${atBottom})`
    );
  }
}

async function main() {
  console.log('Scan data for updates...');

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Clean upload folder
  clearFilesFromFolder('./upload', ['.txt'])

  const harPath = path.join(UPLOAD_DIR, `${formatDate(new Date())}.har`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: IS_CI
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : []
  });
  const context = await browser.newContext({
    recordHar: {
      path: harPath,
      content: 'embed',
      urlFilter: '**/query*'
    },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  page.setDefaultTimeout(ACTION_TIMEOUT);
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

  try {
    await gotoWithRetry(page, PLAYLIST_URL);
    await acceptCookies(page);
    await page.waitForTimeout(SCROLL_DELAY);
    await scrollToBottom(page);

    console.log('Loading artist page...');
    await gotoWithRetry(page, ARTIST_URL);
    await page.waitForTimeout(ARTIST_LOAD_DELAY);
  } finally {
    // Closing the context flushes every captured /query request into a single HAR file
    await context.close();
    await browser.close();
  }

  console.log(`Saved combined HAR to ${harPath}`);
}

// Run the script
main().catch((error) => {
  console.error('Failed to update Spotify HAR data:', error);
  process.exitCode = 1;
});