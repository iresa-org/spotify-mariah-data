import { readFile } from "fs/promises";
import { writeToFile } from "./utils/file.utils.ts";
import type { AlbumData } from "./config/album.config.ts";
import type { GetDailyResult } from "./config/daily.config.ts";

interface TrackWithDetails {
  uid: string;
  name: string;
  count: string;
  change: string;
  percentChange: string;
}

interface AlbumWithDetails {
  name: string;
  uri: string;
  count: string;
  change: string;
  percentChange: string;
}

async function getCurrentData(): Promise<Omit<GetDailyResult, "albums" | "eps">> {
  const content = await readFile('./result/current.json', 'utf-8');
  return JSON.parse(content) as Omit<GetDailyResult, "albums" | "eps">;
}

async function getAlbumData(): Promise<AlbumData[]> {
  const content = await readFile('./result/albums.json', 'utf-8');
  return JSON.parse(content) as AlbumData[];
}

async function getEpData(): Promise<AlbumData[]> {
  const content = await readFile('./result/eps.json', 'utf-8');
  return JSON.parse(content) as AlbumData[];
}

function formatNumber(num: string): string {
  return Number(num).toLocaleString();
}

function formatChange(num: string): string {
  const n = Number(num);
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${Math.abs(n).toLocaleString()}`;
}

function formatPercent(num: string | undefined): string {
  const n = Number(num || '0');
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(2)}%`;
}

function generateTrackTable(tracks: TrackWithDetails[]): string {
  const header = '| Rank | Song | Total Streams | Change | % Change |\n' +
                '|------|------|---------------|--------|----------|\n';

  const rows = tracks
    .slice(0, 25)
    .map((track, idx) => {
      return `| ${idx + 1} | ${track.name} | ${formatNumber(track.count)} | ${formatNumber(track.change)} | ${formatPercent(track.percentChange)} |`;
    })
    .join('\n');

  return header + rows;
}

function generateAlbumTable(albums: AlbumWithDetails[], releaseLabel = 'Album'): string {
  const header = `| ${releaseLabel} | Total Streams | Change | % Change |\n` +
                '|-------|---------------|--------|----------|\n';

  const rows = albums
    .map((album) => {
      return `| ${album.name} | ${formatNumber(album.count)} | ${formatNumber(album.change)} | ${formatPercent(album.percentChange)} |`;
    })
    .join('\n');

  return header + rows;
}

interface GenerateReadmeContentParams {
  lastUpdate: string;
  playCounts: GetDailyResult["playCounts"];
  monthlyListeners: GetDailyResult["monthlyListeners"];
  followers: GetDailyResult["followers"];
  tracks: TrackWithDetails[];
  albums: AlbumWithDetails[];
  eps: AlbumWithDetails[];
}

function generateReadmeContent({
  lastUpdate,
  playCounts,
  monthlyListeners,
  followers,
  tracks,
  albums,
  eps
}: GenerateReadmeContentParams): string {
  const content = `# Mariah Carey on Spotify - Last Updated: ${lastUpdate}
Monthly Listeners: ${formatNumber(monthlyListeners.count)} (${formatChange(monthlyListeners.change)})<br>
Followers: ${formatNumber(followers.count)} (${formatChange(followers.change)})

## Streams Overview
| Metric | Total Streams | Daily Change | % Change |
|--------|---------|--------------|----------|
| Total Streams | ${formatNumber(playCounts.total.count)} | ${formatNumber(playCounts.total.change)} | ${formatPercent(playCounts.total.percentChange)} |
| Lead Streams | ${formatNumber(playCounts.lead.count)} | ${formatNumber(playCounts.lead.change)} | ${formatPercent(playCounts.lead.percentChange)} |
| Solo Streams | ${formatNumber(playCounts.solo.count)} | ${formatNumber(playCounts.solo.change)} | ${formatPercent(playCounts.solo.percentChange)} |
| Featured Streams | ${formatNumber(playCounts.featured.count)} | ${formatNumber(playCounts.featured.change)} | ${formatPercent(playCounts.featured.percentChange)} |
| Video Streams | ${formatNumber(playCounts.videos.count)} | ${formatNumber(playCounts.videos.change)} | ${formatPercent(playCounts.videos.percentChange)} |

## Top 25 Daily Streamed Songs
${generateTrackTable(tracks)}

## Album Streams
${generateAlbumTable(albums)}

## EP Streams
${generateAlbumTable(eps, 'EP')}
`;

  return content;
}

async function main() {
  try {
    console.log('Updating README...');

    const [data, albums, eps] = await Promise.all([getCurrentData(), getAlbumData(), getEpData()]);

    const tracksWithDetails: TrackWithDetails[] = data.tracks
      .filter(track => track.countMerged !== true)
      .map(track => {
      const trackData = track.trackDetails.itemV2?.data;
      return {
        uid: track.trackDetails.uid,
        name: trackData?.name || 'Unknown',
        count: track.dailyChanges.count,
        change: track.dailyChanges.change,
        percentChange: track.dailyChanges.percentChange || '0'
      };
      });

    // Sort by daily change descending
    tracksWithDetails.sort((a, b) => Number(b.change) - Number(a.change));

    // Process albums with details
    const albumsWithDetails: AlbumWithDetails[] = albums
      .map(album => ({
        name: album.albumDetails.name || 'Unknown Album',
        uri: album.uri,
        count: album.dailyChanges.count,
        change: album.dailyChanges.change,
        percentChange: album.dailyChanges.percentChange || '0'
      }))
      .sort((a, b) => Number(b.change) - Number(a.change));

    const epsWithDetails: AlbumWithDetails[] = eps
      .map(album => ({
        name: album.albumDetails.name || 'Unknown EP',
        uri: album.uri,
        count: album.dailyChanges.count,
        change: album.dailyChanges.change,
        percentChange: album.dailyChanges.percentChange || '0'
      }))
      .sort((a, b) => Number(b.change) - Number(a.change));

    // Generate README content
    const readmeContent = generateReadmeContent({
      lastUpdate: data.lastUpdate,
      playCounts: data.playCounts,
      monthlyListeners: data.monthlyListeners,
      followers: data.followers,
      tracks: tracksWithDetails,
      albums: albumsWithDetails,
      eps: epsWithDetails
    });

    // Write to README.md
    await writeToFile('.', 'README.md', readmeContent);

    console.log('✓ README.md updated successfully');
  } catch (error) {
    console.error('Error updating README:', error);
  }
}

// Run the script
main();