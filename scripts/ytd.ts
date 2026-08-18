import { readFile } from "fs/promises";
import { promises as fs } from "fs";
import * as path from "path";
import { getLatestFile, getOldestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { AlbumData } from "./config/album.config.ts";
import type { YTDSumModel } from "./config/ytd.config.ts";
import { subtractNumbers } from "./utils/count.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import { convertMapToObject } from "./utils/map.utils.ts";

function processTrackDailyChange(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { count: element.count, change: element.change })
  });
  return map;
}

function processYtdSumContent(oldestDailyChangeMap: Map<string, BaseDailyChange>, latestDailyChangeMap: Map<string, BaseDailyChange>) {

  const tracks: YTDSumModel = new Map();

  for (let [uid, value] of latestDailyChangeMap) {
    if (oldestDailyChangeMap.has(uid)) {
      const start = oldestDailyChangeMap.get(uid)?.count ?? '0';
      const end = value.count;
      const diff = start === end ? end : subtractNumbers(start, end);
      tracks.set(uid, String(diff));
    } else {
      tracks.set(uid, String(value.count));
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

function calcAlbumSums(albums: AlbumData[], trackSums: Record<string, string>): Record<string, string> {

  const albumMap: YTDSumModel = new Map();

  albums?.forEach(album => {
    const total = album.albumDetails.tracks.reduce((acc, trackUid) => {
      const trackValue = trackSums[trackUid] ?? '0';
      return String(BigInt(acc) + BigInt(trackValue));
    }, '0');
    albumMap.set(album.uri, total);
  });
  return convertMapToObject(albumMap);
}

function cleanMapInPlace(map: Map<any, any>): Map<any, any> {
  for (const [key, value] of map.entries()) {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      map.delete(key);
    }
  }
  return map;
}

// Groups daily file paths (YYYY-MM-DD.json) inside /daily by their MM month key.
async function groupFilesByMonth(directoryPath: string): Promise<Map<string, string[]>> {
  const groups = new Map<string, string[]>();
  for (let i = 1; i <= 12; i++) {
    groups.set(i.toString().padStart(2, '0'), []);
  }

  try {
    const files = await fs.readdir(directoryPath);
    const dateRegex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/;

    for (const file of files) {
      const match = file.match(dateRegex);
      if (match) {
        const month = match[2];
        if (month && groups.has(month)) {
          groups.get(month)!.push(path.join(directoryPath, file));
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory: ${(error as Error).message}`);
  }

  return cleanMapInPlace(groups);
}

// Sums each track's daily "change" across all files in a month.
function sumTrackChangesForMonth(fileContents: DailyCountOutput[]): Record<string, string> {
  const map = new Map<string, bigint>();

  for (const content of fileContents) {
    content.tracks.forEach(track => {
      const current = map.get(track.uid) ?? BigInt(0);
      map.set(track.uid, current + BigInt(track.change));
    });
  }

  const result = new Map<string, string>();
  for (const [uid, value] of map) {
    result.set(uid, String(value));
  }
  return convertMapToObject(result);
}

async function calcMonthly(): Promise<Record<string, { tracks: Record<string, string>, albums: Record<string, string> }>> {
  const groups = await groupFilesByMonth('./daily');
  const result: Record<string, { tracks: Record<string, string>, albums: Record<string, string> }> = {};

  for (const [month, files] of groups) {
    const sortedFiles = [...files].sort();
    const contents = await Promise.all(
      sortedFiles.map(async file => JSON.parse(await readFile(file, 'utf-8')) as DailyCountOutput)
    );

    const tracks = sumTrackChangesForMonth(contents);
    // Use the latest day's albums list within the month for the album -> track mapping.
    const latestContent = contents[contents.length - 1]!;
    const albums = calcAlbumSums(latestContent.albums ?? [], tracks);

    result[month] = { tracks, albums };
  }
  return result;
}

// Reads the previously written ytd.json so months without /daily files anymore aren't lost.
async function readExistingMonthly(): Promise<Record<string, { tracks: Record<string, string>, albums: Record<string, string> }>> {
  try {
    const contents = await readFile('./ytd/ytd.json', 'utf-8');
    return (JSON.parse(contents).monthly) ?? {};
  } catch {
    return {};
  }
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
    const latestDailyCountOutput = JSON.parse(latestDailyChangeContents) as DailyCountOutput;
    const albums = calcAlbumSums(latestDailyCountOutput.albums ?? [], tracks);

    const existingMonthly = await readExistingMonthly();
    const monthly = { ...existingMonthly, ...await calcMonthly() };

    writeToFile(`./ytd`, 'ytd.json', JSON.stringify({ ytd: { tracks, albums }, monthly }))
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();