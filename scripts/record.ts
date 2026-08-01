import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { RecordModel } from "./config/record.config.ts";
import { isBiggerNumber } from "./utils/count.utils.ts";
import { extractDateFromPath } from "./utils/date.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import { convertMapToObject } from "./utils/map.utils.ts";

type RecordMap = Map<string, Pick<RecordModel, 'change' | 'date'>>;

function processDailyChangeContent(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  const dailyCountOutput = JSON.parse(input) as DailyCountOutput;

  dailyCountOutput.tracks.forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

function processRecordContent(input: string, dailyChangeMap: Map<string, BaseDailyChange>, lastUpdate: string) {

  const result: RecordMap = new Map();

  const recordMap: RecordMap = new Map(Object.entries(JSON.parse(input)));

  Array.from(dailyChangeMap.entries()).forEach(([uid, value]: [string, BaseDailyChange]) => {
    const { change: currChange } = value;
    const record = recordMap.get(uid);
    if (!record) {
      result.set(uid, { change: currChange, date: lastUpdate });
    } else if (record && isBiggerNumber(currChange, record.change)) {
      result.set(uid, { change: currChange, date: lastUpdate });
    } else {
      result.set(uid, { change: record.change, date: record.date });
    }
  });
  return convertMapToObject(result);
}

async function updateRecords(fileName: string, latestDailyChanges: Map<string, BaseDailyChange>, lastestUpdateDayStr: string) {
  const recFile = await getLatestFile('./records', [fileName]);
  if (recFile) {
    console.log(`Reading`, recFile);
    const allTimeRecContents = await readFile(recFile, 'utf-8');
    const allTimeRec = processRecordContent(allTimeRecContents, latestDailyChanges, lastestUpdateDayStr);
    writeToFile(`./records`, fileName, JSON.stringify(allTimeRec))
  } else {
    console.error(`Error reading ${fileName}. Initializing...`);
    const result = [];
    for (let [uid, value] of latestDailyChanges) {
      result.push({
        uid,
        change: value.change,
        date: lastestUpdateDayStr
      })
    }
    writeToFile(`./records`, fileName, JSON.stringify(result))
  }
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
    const lastestUpdateDayStr = extractDateFromPath(lastestDailyChangeFile ?? '');

    // Process all time records
    await updateRecords('allTime.json', latestDailyChanges, lastestUpdateDayStr);

    // Process current year records
    await updateRecords('year.json', latestDailyChanges, lastestUpdateDayStr);



  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();