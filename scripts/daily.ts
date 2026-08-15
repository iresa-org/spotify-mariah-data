import { readFile } from "fs/promises";
import { clearFilesFromFolder, getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput, GetDailyResult } from "./config/daily.config.ts";
import { extractDateFromPath, formatDate, getTomorrowDate, getYesterdayDate, parseLocalDate } from "./utils/date.utils.ts";
import { calcDailyChanges, calcPercentChange, convertToAlbumList, filterAlbums, getAlbumsFromTracks, getDuplicateIds, getTotalStreams, getTrackCategories, calcRankDiff, subtractNumbers } from "./utils/count.utils.ts";
import type { ArtistContentItem, SpotifyArtistData, SpotifyContentData, SpotifyTrackData } from "./config/source.config.ts";
import type { BaseDailyChange, TrackDailyChange, TrackData } from "./config/track.config.ts";
import { extractHarContent } from "./utils/har-reader.utils.ts";

function processTrackContent(el: SpotifyTrackData, prevMap: Map<string, TrackDailyChange>, map: Map<string, TrackData>) {
  const content = el.data.playlistV2?.content;
  if (content?.items) {
    content.items.forEach((item) => {
      map.set(item.uid, {
        trackDetails: item,
        dailyChanges: calcDailyChanges(item, prevMap),
        categories: getTrackCategories(item)
      });
    })
  }
}

function processUploadContent(list: SpotifyContentData[], prevFileContents: string | null, prevDate: Date): GetDailyResult {
  const map = new Map<string, TrackData>();
  const prevMap = prevFileContents ? processPrevTracksChanges(prevFileContents) : new Map<string, TrackDailyChange>();

  let artistData: SpotifyArtistData = {} as SpotifyArtistData;

  list.forEach((el) => {
    if (el.data.hasOwnProperty('playlistV2')) {
      processTrackContent(el as SpotifyTrackData, prevMap, map)
    } else if (el.data.hasOwnProperty('artistUnion')) {
      artistData = el as SpotifyArtistData;
    }

  })

  const duplicates = getDuplicateIds(Array.from(map.values()));
  const tracks = Array.from(map.values()).map(item => duplicates.has(item.trackDetails.uid) ? ({ ...item, countMerged: true }) : item);
  const listWoDupl = tracks.filter(item => !item.countMerged);
  const leadList = listWoDupl.filter(item => item.categories.includes('L'))
  const soloList = leadList.filter(item => item.categories.includes('S'))
  const featuredList = listWoDupl.filter(item => item.categories.includes('F'))
  const videos = listWoDupl.filter(item => item.categories.includes('V'))
  const albumMap = filterAlbums(getAlbumsFromTracks(map));
  const artist = artistData ? artistData.data.artistUnion : null;

  return {
    tracks,
    playCounts: {
      total: getTotalStreams(listWoDupl),
      lead: getTotalStreams(leadList),
      solo: getTotalStreams(soloList),
      featured: getTotalStreams(featuredList),
      videos: getTotalStreams(videos),
    },
    albums: convertToAlbumList(albumMap),
    lastUpdate: formatDate(prevDate),
    artist,
    monthlyListeners: getMonthlyListeners(prevFileContents ?? '', artistData?.data.artistUnion?.stats.monthlyListeners),
    followers: getFollowers(prevFileContents ?? '', artistData?.data.artistUnion?.stats.followers),
    topTracks: getTopTracks(prevFileContents ?? '', artist)
  }
}

function processPrevTracksChanges(input: string): Map<string, TrackDailyChange> {

  const map = new Map<string, TrackDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { count: element.count, change: element.change })
  });
  return map;
}

function processPrevTopTracks(input: string): Map<string, number> {
  const map = new Map<string, number>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.topTracks?.forEach((element, idx) => {
    map.set(element.uid, idx)
  });
  return map;
}

function getMonthlyListeners(prevDayInput: string = '', currentListeners: number): BaseDailyChange {
  const prevOutput = JSON.parse(prevDayInput) as DailyCountOutput;
  const prevCount = prevOutput.monthlyListeners;
  return {
    count: String(currentListeners),
    change: subtractNumbers(prevCount, String(currentListeners)).toString(),
    percentChange: String(calcPercentChange(BigInt(prevCount), BigInt(currentListeners)))
  }
}

function getFollowers(prevDayInput: string = '', currentFollowers: number): BaseDailyChange {
  const prevOutput = JSON.parse(prevDayInput) as DailyCountOutput;
  const prevCount = prevOutput.followers;
  return {
    count: String(currentFollowers),
    change: subtractNumbers(prevCount, String(currentFollowers)).toString(),
    percentChange: String(calcPercentChange(BigInt(prevCount), BigInt(currentFollowers)))
  }
}

function getTopTracks(prevDayInput: string = '', artist: ArtistContentItem | null): { uid: string, diff: string }[] {
  const prevTopTracks = processPrevTopTracks(prevDayInput);
  return artist ? artist.discography.topTracks.items.map((item, idx) => ({ uid: item.uid, diff: calcRankDiff(idx, prevTopTracks.get(item.uid)) })) : []
}

async function main() {
  console.log('Build daily changes...');

  try {

    // Read the latest file from /upload directory
    const uploadFilePath = await getLatestFile('./upload', ['.har']);
    if (!uploadFilePath) {
      console.log('No upload. Skip');
      return;
    }
    console.log('Upload file:', uploadFilePath);

    // Read previous file from current directory
    const prevFilePath = await getLatestFile('./daily', ['.json']);
    let prevFileContents = prevFilePath && await readFile(prevFilePath, 'utf-8');

    // get previous date
    const prevDateStr = extractDateFromPath(prevFilePath ?? '');
    const prevDate = getTomorrowDate(parseLocalDate(prevDateStr)) ?? getYesterdayDate();

    // Parse data and calculate changes
    const uploadFileContents = await readFile(uploadFilePath!, 'utf-8');
    const resp = processUploadContent(extractHarContent(uploadFileContents), prevFileContents, prevDate)

    // Write to result
    const result = JSON.stringify(resp);
    writeToFile(`./result`, 'current.json', result)

    // Write to daily
    const tracks = resp.tracks.map(track => ({ uid: track.trackDetails.uid, count: track.dailyChanges.count, change: track.dailyChanges.change }));
    const dailyResult: DailyCountOutput = {
      tracks,
      playCounts: resp.playCounts,
      monthlyListeners: resp.monthlyListeners.count,
      followers: resp.followers.count,
      albums: resp.albums,
      topTracks: resp.artist?.discography.topTracks.items.map(item => ({ uid: item.uid })) ?? [] as any[]
    }
    writeToFile(`./daily`, `${formatDate(prevDate)}.json`, JSON.stringify(dailyResult))

    // Clean upload folder
    clearFilesFromFolder('./upload', ['.txt'])

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();