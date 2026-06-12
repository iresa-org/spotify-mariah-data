import { readFile } from "fs/promises";
import type { ContentItem, SpotifyTrackData, TrackDailyChange, TrackData } from "./config/track.config.ts";
import { writeToFile } from "./file.utils.ts";

function processUploadContent(list: SpotifyTrackData[]): Map<string, ContentItem> {
  const map = new Map<string, ContentItem>();

  list.forEach((el) => {
    const content = el.data.playlistV2?.content;
    if (content?.items) {
      content.items.forEach((item) => {

        if (!map.has(item.uid)) {
          map.set(item.uid, item);
        }
      })
    }
  })
  return map
}

async function main() {
  console.log('Calculate daily changes...');

  let currMap: Map<string, ContentItem> | null = null;
  let prevMap: Map<string, ContentItem> | null = null;

  try {

    // Read the latest file from /upload directory
    const currFileContents = await readFile('./raw/2026-06-09.json', 'utf-8');
    if (!currFileContents) {
      console.log('No current file. Skip');
      return;
    }

    // Read previous file from current directory
    const prevFileContents = await readFile('./raw/2026-06-08.json', 'utf-8');
    if (!prevFileContents) {
      console.log('No prev file. Skip');
      return;
    }

    currMap = processUploadContent(JSON.parse(currFileContents))
    prevMap = processUploadContent(JSON.parse(prevFileContents))

    let result: any[] = [];
    for (let [uid, curr] of currMap) {
      let prevTotal = BigInt(0);
      if (prevMap.has(uid)) {
        const prev = prevMap.get(uid);
        prevTotal = BigInt(prev?.itemV2.data.playcount ?? 0);
      }
      const currTotal = curr?.itemV2.data.playcount ?? 0;
      const change = BigInt(currTotal) - BigInt(prevTotal);
      result.push(`${uid} ${currTotal} ${change}`)
    }

    writeToFile(`./daily`, '2026-06-09.txt', result.join('\n'))


  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();