import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { RecordModel } from "./config/record.config.ts";
import { isBiggerNumber } from "./utils/count.utils.ts";
import { extractDateFromPath } from "./utils/date.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import { convertMapToObject, convertObjectToMap } from "./utils/map.utils.ts";

type RecordMap = Map<string, RecordModel>;

function processTrackDailyChange(dailyCountOutput: DailyCountOutput): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  dailyCountOutput.tracks?.forEach((element: any) => {
    map.set(element.uid, { playCount: element.playCount, change: element.change })
  });
  return map;
}

function processAlbumDailyChange(dailyCountOutput: DailyCountOutput): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  dailyCountOutput.albums?.forEach(element => {
    map.set(element.uri, { playCount: element.dailyChanges.playCount, change: element.dailyChanges.change })
  });
  return map;
}

function processTrackRecord(input: string, dailyChangeMap: Map<string, BaseDailyChange>, lastUpdate: string) {

  const recordMap: RecordMap = convertObjectToMap(JSON.parse(input).tracks);

  Array.from(dailyChangeMap.entries()).forEach(([uid, value]: [string, BaseDailyChange]) => {
    const { change: currChange } = value;
    const record = recordMap.get(uid);
    if (!record) {
      recordMap.set(uid, { change: currChange, date: lastUpdate });
    } else if (record && isBiggerNumber(currChange, record.change)) {
      recordMap.set(uid, { change: currChange, date: lastUpdate });
    }
  });
  return convertMapToObject(recordMap);
}

function processAlbumRecord(input: string, dailyChangeMap: Map<string, BaseDailyChange>, lastUpdate: string) {

  const recordMap: RecordMap = convertObjectToMap(JSON.parse(input).albums);
  Array.from(dailyChangeMap.entries()).forEach(([uri, value]: [string, BaseDailyChange]) => {
    const { change: currChange } = value;
    const record = recordMap.get(uri);
    if (!record) {
      recordMap.set(uri, { change: currChange, date: lastUpdate });
    } else if (record && isBiggerNumber(currChange, record.change)) {
      recordMap.set(uri, { change: currChange, date: lastUpdate });
    }
  });
  return convertMapToObject(recordMap);

}

async function updateRecords(fileName: string, dailyCountOutput: DailyCountOutput, lastestUpdateDayStr: string) {
  const trackDailyChanges = processTrackDailyChange(dailyCountOutput);
  const albumDailyChanges = processAlbumDailyChange(dailyCountOutput);

  const recFile = await getLatestFile('./records', [fileName]);
  if (recFile) {
    console.log(`Reading`, recFile);
    const allTimeRecContents = await readFile(recFile, 'utf-8');
    const tracks = processTrackRecord(allTimeRecContents, trackDailyChanges, lastestUpdateDayStr);
    const albums = processAlbumRecord(allTimeRecContents, albumDailyChanges, lastestUpdateDayStr);
    writeToFile(`./records`, fileName, JSON.stringify({ tracks, albums }));
  } else {
    console.error(`Error reading ${fileName}. Initializing...`);
    const tracks = new Map<string, RecordModel>();
    const albums = new Map<string, RecordModel>();
    for (let [uid, value] of trackDailyChanges) {
      tracks.set(uid, {
        change: value.change,
        date: lastestUpdateDayStr
      });
    }
    for (let [uri, value] of albumDailyChanges) {
      albums.set(uri, {
        change: value.change,
        date: lastestUpdateDayStr
      });
    }
    writeToFile(`./records`, fileName, JSON.stringify({ tracks: convertMapToObject(tracks), albums: convertMapToObject(albums) }));
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
    const latestDailyChanges = JSON.parse(latestDailyChangeContents) as DailyCountOutput;
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