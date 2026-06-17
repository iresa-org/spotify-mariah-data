import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import type { RecordModel, YTDSumModel } from "./config/record.config.ts";
import { addNumbers, compareNumbers } from "./utils/count.utils.ts";
import { formatDate } from "./utils/date.utils.ts";

function processDailyChangeContent(input: string): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  const separateLines = input.split(/\r?\n|\r|\n/g);
  separateLines.forEach((element: any) => {
    const [uid, playCount, change] = element.trim().split(/\s*[\s,]\s*/);
    map.set(uid, { playCount, change })
  });
  return map;
}

function processRecordContent(input: string, dailyChangeMap: Map<string, BaseDailyChange>): RecordModel[] {

  const result: RecordModel[] = [];

  JSON.parse(input).forEach((element: any) => {
    const { uid, change, date } = element;
    const currChange = dailyChangeMap.get(uid);
    if (currChange && compareNumbers(currChange.change, change)) {
      result.push({ uid, change: currChange.change, date: formatDate(new Date()) })
    } else {
      result.push({ uid, change, date })
    }
  });
  return result;
}

function processYtdSumContent(input: string, dailyChangeMap: Map<string, BaseDailyChange>): YTDSumModel[] {

  const result: YTDSumModel[] = [];

  JSON.parse(input).forEach((element: any) => {
    const { uid, sum } = element;
    const currChange = dailyChangeMap.get(uid);
    if (currChange) {
      result.push({ uid, sum: String(addNumbers(sum, currChange.change)) })
    } else {
      result.push({ uid, sum })
    }
  });
  return result;
}

async function main() {
  console.log('Update records...');

  try {

    // Read the latest file from /daily directory
    const dailyChangeFile = await getLatestFile('./daily', ['.txt']);
    if (!dailyChangeFile) {
      console.log('No daily changes. Skip');
      return;
    }
    console.log('Daily Change file:', dailyChangeFile);
    const dailyChangeContents = await readFile(dailyChangeFile, 'utf-8');
    const dailyChanges = processDailyChangeContent(dailyChangeContents);

    // Process all time records
    const allTimeRecFile = await getLatestFile('./records', ['allTime.json']);
    if (allTimeRecFile) {
      console.log('All Time Record file:', allTimeRecFile);
      const allTimeRecContents = await readFile(allTimeRecFile, 'utf-8');
      const allTimeRec = processRecordContent(allTimeRecContents, dailyChanges);
      writeToFile(`./records`, 'allTime.json', JSON.stringify(allTimeRec))
    } else {
      const result = [];
      for (let [uid, value] of dailyChanges) {
        result.push({
          uid,
          change: value.change,
          date: formatDate(new Date())
        })
      }
      writeToFile(`./records`, 'allTime.json', JSON.stringify(result))
    }

    // Process YTD records
    const ytdSumFile = await getLatestFile('./records', ['ytd.json']);
    if (ytdSumFile) {
      console.log('YTD Sum file:', ytdSumFile);
      const ytdSumContents = await readFile(ytdSumFile, 'utf-8');
      const ytdSum = processYtdSumContent(ytdSumContents, dailyChanges);
      writeToFile(`./records`, 'ytd.json', JSON.stringify(ytdSum))
    } else {
      const result = [];
      for (let [uid, value] of dailyChanges) {
        result.push({
          uid,
          sum: value.change
        })
      }
      writeToFile(`./records`, 'ytd.json', JSON.stringify(result))
    }

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();