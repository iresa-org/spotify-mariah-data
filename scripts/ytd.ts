import { readFile } from "fs/promises";
import { getLatestFile, getOldestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { YTDSumModel } from "./config/ytd.config.ts";
import { subtractNumbers } from "./utils/count.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import { convertMapToObject } from "./utils/map.utils.ts";

function processTrackDailyChange(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

function processYtdSumContent(oldestDailyChangeMap: Map<string, BaseDailyChange>, latestDailyChangeMap: Map<string, BaseDailyChange>) {

  const tracks: YTDSumModel = new Map();

  for (let [uid, value] of latestDailyChangeMap) {
    if (oldestDailyChangeMap.has(uid)) {
      const start = oldestDailyChangeMap.get(uid)?.playCount ?? '0';
      const end = value.playCount;
      const diff = start === end ? end : subtractNumbers(start, end);
      tracks.set(uid, String(diff));
    } else {
      tracks.set(uid, String(value.playCount));
    }
  }
  return tracks;
}

async function calcTrackYtd(latestDailyChanges: Map<string, BaseDailyChange>): Promise<Record<string, string>> {

  // Read the oldest file from /daily directory
  const oldestDailyChangeFile = await getOldestFile('./daily', ['.json']);
  if (oldestDailyChangeFile) {
    console.log('Oldest daily Change file:', oldestDailyChangeFile);
    const oldestDailyChangeContents = await readFile(oldestDailyChangeFile, 'utf-8');
    const oldestDailyChanges = processTrackDailyChange(oldestDailyChangeContents);
    return convertMapToObject(processYtdSumContent(oldestDailyChanges, latestDailyChanges));

  } else {
    console.error('Error reading oldest daily changes. Initializing...');
    const result = new Map<string, string>();
    for (let [uid, value] of latestDailyChanges) {
      result.set(uid, value.change);
    }
    return convertMapToObject(result);
  }
}

function calcAlbumYtd(input: string, trackYTD: Record<string, string>): Record<string, string> {

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;
  const albumMap: YTDSumModel = new Map();

  dailyCountOutput.albums?.forEach(album => {
    const total = album.albumDetails.tracks.reduce((acc, trackUid) => {
      const trackYtdValue = trackYTD[trackUid] ?? '0';
      return String(BigInt(acc) + BigInt(trackYtdValue));
    }, '0');
    albumMap.set(album.uri, total);
  });
  return convertMapToObject(albumMap);
}

async function main() {
  console.log('Update YTD...');

  try {

    // Read the latest file from /daily directory
    const lastestDailyChangeFile = await getLatestFile('./daily', ['.json']);
    if (!lastestDailyChangeFile) {
      console.log('No latest daily changes. Skip');
      return;
    }
    console.log('Latest daily Change file:', lastestDailyChangeFile);
    const latestDailyChangeContents = await readFile(lastestDailyChangeFile, 'utf-8');
    const latestDailyChanges = processTrackDailyChange(latestDailyChangeContents);

    const tracks = await calcTrackYtd(latestDailyChanges);
    const albums = await calcAlbumYtd(latestDailyChangeContents, tracks);

    writeToFile(`./ytd`, 'ytd.json', JSON.stringify({ tracks, albums }))
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();