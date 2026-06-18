import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import type { RecordModel } from "./config/record.config.ts";
import { compareNumbers } from "./utils/count.utils.ts";
import { extractDateFromPath } from "./utils/date.utils.ts";

function processDailyChangeContent(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  JSON.parse(input).forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

function processRecordContent(input: string, dailyChangeMap: Map<string, BaseDailyChange>, lastUpdate: string): RecordModel[] {

  const result: RecordModel[] = [];

  JSON.parse(input).forEach((element: any) => {
    const { uid, change, date } = element;
    const currChange = dailyChangeMap.get(uid);
    if (currChange && compareNumbers(currChange.change, change)) {
      result.push({ uid, change: currChange.change, date: lastUpdate })
    } else {
      result.push({ uid, change, date })
    }
  });
  return result;
}

async function main() {
  console.log('Update records...');

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

    // Process all time records
    const allTimeRecFile = await getLatestFile('./records', ['allTime.json']);
    const lastestUpdateDayStr = extractDateFromPath(lastestDailyChangeFile ?? '');
    if (allTimeRecFile) {
      console.log('All Time Record file:', allTimeRecFile);
      const allTimeRecContents = await readFile(allTimeRecFile, 'utf-8');
      const allTimeRec = processRecordContent(allTimeRecContents, latestDailyChanges, lastestUpdateDayStr);
      writeToFile(`./records`, 'allTime.json', JSON.stringify(allTimeRec))
    } else {
      console.error('Error reading all time record. Initializing...');
      const result = [];
      for (let [uid, value] of latestDailyChanges) {
        result.push({
          uid,
          change: value.change,
          date: lastestUpdateDayStr
        })
      }
      writeToFile(`./records`, 'allTime.json', JSON.stringify(result))
    }

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();