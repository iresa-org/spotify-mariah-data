import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import { extractDateFromPath, formatDate } from "./utils/date.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { TrackData } from "./config/track.config.ts";
import type { AlbumData } from "./config/album.config.ts";
import { SELECTED_ALBUMS } from "./config/album-list.ts";

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

// Map of album URIs to album names
const ALBUM_MAP: Record<string, string> = {
  'spotify:album:0O4U8aVbBcWrq38ax0T6AO': 'The Emancipation Of Mimi (20th Anniversary Edition)',
  'spotify:album:0SHpIbyBLUugMXsl3yNkUz': 'Emotions',
  'spotify:album:0cS9prZ8u3fdbc7lmtCaMV': 'Merry Christmas (Deluxe Anniversary Edition)',
  'spotify:album:0v1DRRYBXYg1uVN1CIsyy0': 'The Rarities',
  'spotify:album:1GzBLltCCKsiIJM3T3AWj3': 'Music Box: 30th Anniversary Edition',
  'spotify:album:3KGlZ9YeHexP80A3scG86n': 'Daydream (30th Anniversary Edition)',
  'spotify:album:2VtWkFLhMJAFsWkHAXwosS': 'Caution (Japan Version)',
  'spotify:album:2hHFZLYnwsYOOxTCrlNvg0': 'Glitter',
  'spotify:album:2tVxdAJ16NY9bpjb1h5fQc': 'Me. I Am Mariah…The Elusive Chanteuse (Deluxe)',
  'spotify:album:31MluXLYC0ZnCSfUZ5T4GX': 'E=MC2 (Deluxe Version)',
  'spotify:album:3RPImDZ7Ihh5YR5iJh1gH1': 'Memoirs of an imperfect Angel',
  'spotify:album:3VOqo81Nwyx8rcZEc2l379': 'Butterfly: 25th Anniversary Expanded Edition',
  'spotify:album:6fC6BRXbuHSVobwWcwe6M7': 'Merry Christmas II You',
  'spotify:album:5SwNGsGw1I8H361DKiYnnn': 'Mariah Carey',
  'spotify:album:5VfesyhwiNgpEEPXlO5c84': 'Mariah Carey\'s Magical Christmas Special (Apple TV+ Original Soundtrack)',
  'spotify:album:6MljmKZLh52AUR1v5WpWst': 'Here For It All',
  'spotify:album:6aouVhqJ9SkEUS2gAR0xBS': 'Merry Christmas: 30th Anniversary Edition',
  'spotify:album:6yitEMT7G4qfIcV3jWXP8I': 'Rainbow: 25th Anniversary Expanded Edition',
  'spotify:album:0gTbDhU0tDmXdXn2RNWO2l': 'Charmbracelet',
  'spotify:album:7GTZRYNB0eAig7UTsb54XG': 'The Remixes',
  'spotify:album:0jpGebANqbNNKbWHq2XhEM': 'MTV Unplugged EP'
};

async function getLatestDailyData(): Promise<{ data: DailyCountOutput; date: string } | null> {
  const dailyDir = './daily';
  const latestFile = await getLatestFile(dailyDir, ['.json']);

  if (!latestFile) {
    console.error('No daily files found');
    return null;
  }

  const dateStr = extractDateFromPath(latestFile);
  const content = await readFile(latestFile, 'utf-8');
  const data: DailyCountOutput = JSON.parse(content);

  return { data, date: dateStr };
}

function formatNumber(num: string): string {
  return Number(num).toLocaleString();
}

function formatPercent(num: string): string {
  const n = Number(num);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function generateTrackTable(tracks: TrackWithDetails[]): string {
  const header = '| Rank | Song | Daily Streams | Change | % Change |\n' +
                '|------|------|---------------|--------|----------|\n';

  const rows = tracks
    .slice(0, 25)
    .map((track, idx) => {
      return `| ${idx + 1} | ${track.name} | ${formatNumber(track.count)} | ${formatNumber(track.change)} | ${formatPercent(track.percentChange)} |`;
    })
    .join('\n');

  return header + rows;
}

function generateAlbumTable(albums: AlbumWithDetails[]): string {
  const header = '| Album | Daily Streams | Change | % Change |\n' +
                '|-------|---------------|--------|----------|\n';

  const rows = albums
    .map((album) => {
      return `| ${album.name} | ${formatNumber(album.count)} | ${formatNumber(album.change)} | ${formatPercent(album.percentChange)} |`;
    })
    .join('\n');

  return header + rows;
}

function generateReadmeContent(
  lastUpdate: string,
  playCounts: any,
  tracks: TrackWithDetails[],
  albums: AlbumWithDetails[]
): string {
  const content = `# Mariah Carey on Spotify
Last Updated: ${lastUpdate}

## Streams Overview
| Metric | Streams | Daily Change | % Change |
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
`;

  return content;
}

async function main() {
  try {
    console.log('Updating README...');

    const result = await getLatestDailyData();
    if (!result) {
      console.error('Failed to get latest daily data');
      return;
    }

    const { data, date } = result;

    // Process tracks - we need to extract track names and artists from the dailyCountOutput
    // Since the DailyCountOutput only has UIDs, we need to read the result/current.json
    // or process the track data from the original daily file
    
    // For now, let's use the UIDs and get names from the current.json file
    const currentFile = await readFile('./result/current.json', 'utf-8');
    const currentData = JSON.parse(currentFile);

    // Create a map of UID to track details using the saved result/current.json structure.
    const trackDetailsMap = new Map<string, { name: string }>();

    if (currentData.tracks && Array.isArray(currentData.tracks)) {
      currentData.tracks.forEach((track: any) => {
        const trackData = track.trackDetails?.itemV2?.data || track.itemV2?.data || track.trackDetails;
        if (trackData) {
          const uid = track.uid || track.trackDetails?.uid;
          const name = trackData.name || 'Unknown';
          if (uid) {
            trackDetailsMap.set(uid, { name });
          }
        }
      });
    }

    // Process tracks with details
    const tracksWithDetails: TrackWithDetails[] = data.tracks.map(track => {
      const details = trackDetailsMap.get(track.uid) || { name: 'Unknown' };
      return {
        uid: track.uid,
        name: details.name,
        count: track.count,
        change: track.change,
        percentChange: '0'
      };
    });

    // Sort by count descending
    tracksWithDetails.sort((a, b) => Number(b.count) - Number(a.count));

    // Process albums with details
    const albumsWithDetails: AlbumWithDetails[] = data.albums
      .map(album => ({
        name: ALBUM_MAP[album.uri] || 'Unknown Album',
        uri: album.uri,
        count: album.dailyChanges.count,
        change: album.dailyChanges.change,
        percentChange: album.dailyChanges.percentChange || '0'
      }))
      .sort((a, b) => Number(b.count) - Number(a.count));

    // Generate README content
    const readmeContent = generateReadmeContent(date, data.playCounts, tracksWithDetails, albumsWithDetails);

    // Write to README.md
    await writeToFile('.', 'README.md', readmeContent);

    console.log('✓ README.md updated successfully');
  } catch (error) {
    console.error('Error updating README:', error);
  }
}

// Run the script
main();