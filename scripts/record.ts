import { readFile } from "fs/promises";
import { getLatestFile, writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput } from "./config/daily.config.ts";
import type { RecordModel } from "./config/record.config.ts";
import { isBiggerNumber } from "./utils/count.utils.ts";
import { SELECTED_EPS } from "./config/ep-list.ts";
import { extractDateFromPath } from "./utils/date.utils.ts";
import type { BaseDailyChange } from "./config/track.config.ts";
import { convertMapToObject, convertObjectToMap } from "./utils/map.utils.ts";

type RecordMap = Map<string, RecordModel>;

function processTrackDailyChange(dailyCountOutput: DailyCountOutput): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  dailyCountOutput.tracks?.forEach((element: any) => {
    map.set(element.uid, { count: element.count, change: element.change })
  });
  return map;
}

function processReleaseDailyChange(releases: DailyCountOutput["albums"]): Map<string, BaseDailyChange> {

  const map = new Map<string, BaseDailyChange>();

  releases?.forEach(element => {
    map.set(element.uri, { count: element.dailyChanges.count, change: element.dailyChanges.change })
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

function updateRecordMap(recordMap: RecordMap, dailyChangeMap: Map<string, BaseDailyChange>, lastUpdate: string): RecordMap {
  Array.from(dailyChangeMap.entries()).forEach(([uri, value]: [string, BaseDailyChange]) => {
    const { change: currChange } = value;
    const record = recordMap.get(uri);
    if (!record) {
      recordMap.set(uri, { change: currChange, date: lastUpdate });
    } else if (record && isBiggerNumber(currChange, record.change)) {
      recordMap.set(uri, { change: currChange, date: lastUpdate });
    }
  });
  return recordMap;
}

function getEpSet(...sources: Array<Iterable<string> | undefined>): Set<string> {
  const epSet = new Set<string>(SELECTED_EPS);

  for (const source of sources) {
    if (!source) continue;
    for (const uri of source) {
      epSet.add(uri);
    }
  }

  return epSet;
}

function processReleaseRecords(input: string, albumDailyChanges: Map<string, BaseDailyChange>, epDailyChanges: Map<string, BaseDailyChange>, lastUpdate: string) {
  const previous = JSON.parse(input);
  const epSet = getEpSet(
    SELECTED_EPS,
    Object.keys(previous.eps ?? {}),
    epDailyChanges.keys()
  );
  const albums: RecordMap = convertObjectToMap(previous.albums);
  const eps: RecordMap = convertObjectToMap(previous.eps);

  for (const [uri, record] of albums) {
    if (epSet.has(uri)) {
      eps.set(uri, record);
      albums.delete(uri);
    }
  }

  updateRecordMap(albums, albumDailyChanges, lastUpdate);
  updateRecordMap(eps, epDailyChanges, lastUpdate);
  return { albums: convertMapToObject(albums), eps: convertMapToObject(eps) };

}

async function updateRecords(fileName: string, dailyCountOutput: DailyCountOutput, lastestUpdateDayStr: string) {
  const trackDailyChanges = processTrackDailyChange(dailyCountOutput);
  const albums = dailyCountOutput.albums ?? [];
  const eps = dailyCountOutput.eps ?? [];
  const epSet = getEpSet(SELECTED_EPS, eps.map(ep => ep.uri));
  const explicitEpUris = new Set(eps.map(ep => ep.uri));
  const albumDailyChanges = processReleaseDailyChange(albums.filter(album => !epSet.has(album.uri)));
  const epDailyChanges = processReleaseDailyChange([
    ...albums.filter(album => epSet.has(album.uri) && !explicitEpUris.has(album.uri)),
    ...eps
  ]);

  const recFile = await getLatestFile('./records', [fileName]);
  if (recFile) {
    console.log(`Reading`, recFile);
    const allTimeRecContents = await readFile(recFile, 'utf-8');
    const tracks = processTrackRecord(allTimeRecContents, trackDailyChanges, lastestUpdateDayStr);
    const releases = processReleaseRecords(allTimeRecContents, albumDailyChanges, epDailyChanges, lastestUpdateDayStr);
    writeToFile(`./records`, fileName, JSON.stringify({ tracks, ...releases }));
  } else {
    console.error(`Error reading ${fileName}. Initializing...`);
    const tracks = new Map<string, RecordModel>();
    const albums = new Map<string, RecordModel>();
    const eps = new Map<string, RecordModel>();
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
    for (let [uri, value] of epDailyChanges) {
      eps.set(uri, {
        change: value.change,
        date: lastestUpdateDayStr
      });
    }
    writeToFile(`./records`, fileName, JSON.stringify({ tracks: convertMapToObject(tracks), albums: convertMapToObject(albums), eps: convertMapToObject(eps) }));
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