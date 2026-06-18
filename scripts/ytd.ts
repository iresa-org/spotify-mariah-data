import { readFile } from "fs/promises";
import { getLatestFile, getOldestFile, writeToFile } from "./utils/file.utils.ts";
import type { BaseDailyChange, DailyCountOutput } from "./config/track.config.ts";
import type { YTDSumModel } from "./config/ytd.config.ts";
import { subtractNumbers } from "./utils/count.utils.ts";

function processDailyChangeContent(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

function processYtdSumContent(oldestDailyChangeMap: Map<string, BaseDailyChange>, latestDailyChangeMap: Map<string, BaseDailyChange>): YTDSumModel[] {

  const tracks: YTDSumModel[] = [];

  for (let [uid, value] of latestDailyChangeMap) {
    if (oldestDailyChangeMap.has(uid)) {
      const start = oldestDailyChangeMap.get(uid)?.change ?? '0';
      const end = value.change;
      const diff = start === end ? end : subtractNumbers(start, end);
      tracks.push({ uid, ytd: String(diff)})
    }
  }
  return tracks;
}

async function calcTrackYtd(latestDailyChanges: Map<string, BaseDailyChange>): Promise<YTDSumModel[]> {

  // Read the oldest file from /daily directory
  const oldestDailyChangeFile = await getOldestFile('./daily', ['.json']);
  if (oldestDailyChangeFile) {
    console.log('Oldest daily Change file:', oldestDailyChangeFile);
    const oldestDailyChangeContents = await readFile(oldestDailyChangeFile, 'utf-8');
    const oldestDailyChanges = processDailyChangeContent(oldestDailyChangeContents);
    return processYtdSumContent(oldestDailyChanges, latestDailyChanges);

  } else {
    console.error('Error reading oldest daily changes. Initializing...');
    const result = [];
    for (let [uid, value] of latestDailyChanges) {
      result.push({
        uid,
        ytd: value.change
      })
    }
    return result;
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
    const latestDailyChanges = processDailyChangeContent(latestDailyChangeContents);

    const tracks = await calcTrackYtd(latestDailyChanges);

    writeToFile(`./ytd`, 'ytd.json', JSON.stringify({ tracks }))
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();