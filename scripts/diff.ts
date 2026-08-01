import { readFile } from "fs/promises";
import type { DailyCountOutput } from "./config/daily.config.ts";
import { getLatestFile, getOldestFile, writeToFile } from "./utils/file.utils.ts";
import { convertObjectToMap } from "./utils/map.utils.ts";

async function compareDailyChanges(latestFile: string, oldestFile: string): Promise<void> {
  // Read the contents of the latest and oldest files
  const latestDailyChangeContents = await readFile(latestFile, 'utf-8');
  const oldestDailyChangeContents = await readFile(oldestFile, 'utf-8');

  const latestData = JSON.parse(latestDailyChangeContents) as DailyCountOutput;
  const oldestData = JSON.parse(oldestDailyChangeContents) as DailyCountOutput;

  const latestTracks = latestData.tracks;
  const oldestTracks = oldestData.tracks;

  const oldestTrackMap = convertObjectToMap(oldestTracks.reduce((acc, track) => {
    acc[track.uid] = { playCount: track.playCount, change: track.change };
    return acc;
  }, {} as Record<string, { playCount: string; change: string }>));
  
  let hasChanges = false;
  const arr: string[] = []

  latestTracks.forEach(latestTrack => {
    if (!oldestTrackMap.has(latestTrack.uid)) {
      oldestTracks.push({
        ...latestTrack
      });
      arr.push(latestTrack.uid)
      hasChanges = true;
    }
  })

  console.log('New tracks:', arr);
  hasChanges && writeToFile(oldestFile, '', JSON.stringify({ ...oldestData, tracks: oldestTracks }));
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

    // Read the latest file from /daily directory
    const oldestDailyChangeFile = await getOldestFile('./daily', ['.json']);
    if (!oldestDailyChangeFile) {
      console.log('No oldest daily changes. Skip');
      return;
    }
    console.log('Oldest daily Change file:', oldestDailyChangeFile);

    await compareDailyChanges(lastestDailyChangeFile, oldestDailyChangeFile);

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();