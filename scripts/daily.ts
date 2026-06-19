import { readFile } from "fs/promises";
import { clearFilesFromFolder, getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput, GetTrackDetailResp, SpotifyTrackData, TrackDailyChange, TrackData } from "./config/track.config.ts";
import { extractDateFromPath, formatDate, getTomorrowDate, getYesterdayDate, parseLocalDate } from "./utils/date.utils.ts";
import { calcDailyChanges, convertToAlbumList, filterAlbums, getAlbumsFromTracks, getDuplicateIds, getTotalStreams, getTrackCategories } from "./utils/count.utils.ts";

function processUploadContent(list: SpotifyTrackData[], prevMap: Map<string, TrackDailyChange>): GetTrackDetailResp {
  const map = new Map<string, TrackData>();

  list.forEach((el) => {
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
  })

  const duplicates = getDuplicateIds(Array.from(map.values()));
  const tracks = Array.from(map.values()).map(item => duplicates.has(item.trackDetails.uid) ? ({ ...item, countMerged: true }) : item);
  const listWoDupl = tracks.filter(item => !item.countMerged);
  const leadList = listWoDupl.filter(item => item.categories.includes('L'))
  const soloList = leadList.filter(item => item.categories.includes('S'))
  const featuredList = listWoDupl.filter(item => item.categories.includes('F'))
  const videos = listWoDupl.filter(item => item.categories.includes('V'))
  const albumMap = filterAlbums(getAlbumsFromTracks(map))

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
    lastUpdate: formatDate(new Date())
  }
}

function processPrevChangeContent(input: string): Map<string, TrackDailyChange> {

  const map = new Map<string, TrackDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

async function main() {
  console.log('Build daily changes...');

  let prevMap: Map<string, TrackDailyChange> | null = null;

  try {

    // Read the latest file from /upload directory
    const uploadFilePath = await getLatestFile('./upload', ['.json']);
    if (!uploadFilePath) {
      console.log('No upload. Skip');
      return;
    }
    console.log('Upload file:', uploadFilePath);

    // Read previous file from current directory
    const prevFilePath = await getLatestFile('./daily', ['.json']);
    if (prevFilePath) {
      const prevFileContents = await readFile(prevFilePath!, 'utf-8');
      prevMap = processPrevChangeContent(prevFileContents)
      console.log('Previous change found:', prevFilePath);
    } else {
      prevMap = new Map<string, TrackDailyChange>
    }

    // Parse data and calculate changes
    const uploadFileContents = await readFile(uploadFilePath!, 'utf-8');
    const resp = processUploadContent(JSON.parse(uploadFileContents), prevMap!)

    // Write to result
    const result = JSON.stringify(resp);
    writeToFile(`./result`, 'current.json', result)

    // Write to daily
    let tracks = resp.tracks.map(track => ({ uid: track.trackDetails.uid, playCount: track.dailyChanges.playCount, change: track.dailyChanges.change }));
    const prevDateStr = extractDateFromPath(prevFilePath ?? '');
    const prevDate = getTomorrowDate(parseLocalDate(prevDateStr)) ?? getYesterdayDate();
    writeToFile(`./daily`, `${formatDate(prevDate)}.json`, JSON.stringify({
      tracks,
      playCounts: resp.playCounts
    }))

    // Clean upload folder
    clearFilesFromFolder('./upload', ['.txt'])

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();