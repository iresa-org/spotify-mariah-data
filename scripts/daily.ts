import { readFile } from "fs/promises";
import { clearFilesFromFolder, getLatestFile, writeToFile } from "./file.utils.ts";
import type { ContentItem, SpotifyTrackData, TrackDailyChange, TrackData } from "./config/track.config.ts";
import { formatDate, getTomorrowDate, parseLocalDate } from "./date.utils.ts";

function calcDailyChanges(item: ContentItem, prevMap: Map<string, TrackDailyChange>): TrackDailyChange {
  const { uid, itemV2 } = item;
  let prevTotal = BigInt(0), prevChange = BigInt(0);
  if (prevMap.has(uid)) {
    const prev = prevMap.get(uid);
    prevTotal = BigInt(prev!.currTotal);
    prevChange = BigInt(prev!.change);
  }
  const currTotal = itemV2?.data?.playcount || 0;
  const change = BigInt(currTotal) - BigInt(prevTotal);
  const perctChange = prevChange ? (BigInt(change) - prevChange) * BigInt("100") / prevChange : 0
  return {
    currTotal: String(currTotal),
    change: String(change),
    prevChange: String(prevChange),
    percent: String(perctChange)
  }
}

function processUploadContent(list: SpotifyTrackData[], prevMap: Map<string, TrackDailyChange>): Map<string, TrackData> {
  const map = new Map<string, TrackData>();

  list.forEach((el) => {
    const content = el.data.playlistV2?.content;
    if (content?.items) {
      content.items.forEach((item) => {
        map.set(item.uid, {
          org: item,
          dailyChanges: calcDailyChanges(item, prevMap)
        });
      })
    }
  })
  return map
}

function processPrevChangeContent(input: string): Map<string, TrackDailyChange> {

  const map = new Map<string, TrackDailyChange>();

  const separateLines = input.split(/\r?\n|\r|\n/g);
  separateLines.forEach((element: any) => {
    const [uid, currTotal, change] = element.trim().split(/\s*[\s,]\s*/);
    map.set(uid, { currTotal, change })
  });
  return map;
}

function extractDateFromPath(filePath: string): string {
  // Regex to match exactly 4 digits, a dash, 2 digits, a dash, and 2 digits
  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const match = filePath.match(dateRegex);

  // If a match is found, return it; otherwise, return null
  return match ? match[0] : new Date().toDateString();
}

async function main() {
  console.log('Build daily changes...');

  let currMap: Map<string, TrackData> | null = null;
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
    const prevFilePath = await getLatestFile('./daily', ['.txt']);
    if (prevFilePath) {
      const prevFileContents = await readFile(prevFilePath!, 'utf-8');
      prevMap = processPrevChangeContent(prevFileContents)
      console.log('Previous change found:', prevFilePath);
    } else {
      prevMap = new Map<string, TrackDailyChange>
    }

    // Parse data and calculate changes
    const uploadFileContents = await readFile(uploadFilePath!, 'utf-8');
    currMap = processUploadContent(JSON.parse(uploadFileContents), prevMap!)

    // Write to result
    const result = JSON.stringify(Array.from(currMap.values()));
    writeToFile(`./result`, 'current.txt', result)

    // Write to daily
    let list: any[] = [];
    for (const [uid, value] of currMap) {
      list.push(`${uid} ${value.dailyChanges.currTotal} ${value.dailyChanges.change}`)
    }
    const prevDateStr = extractDateFromPath(prevFilePath ?? '');
    const prevDate = parseLocalDate(prevDateStr) ?? new Date();
    writeToFile(`./daily`, `${formatDate(getTomorrowDate(prevDate))}.txt`, list.join('\n'))

    // Clean upload folder
    clearFilesFromFolder('./upload', ['.txt'])

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();