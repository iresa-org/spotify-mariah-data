import { promises as fs } from 'fs';
import * as path from 'path';
import { extractDateFromPath } from './utils/date.utils.ts';
import { writeToFile } from './utils/file.utils.ts';

interface FileContentMap {
  content: string;
  date: string;
}

/**
 * Reads up to the latest number of files from a directory based on the date in their filename.
 * @param directoryPath The path to the folder containing the files.
 */
async function getLatestFiles(directoryPath: string, numberOfDays: number): Promise<FileContentMap[]> {
  try {
    // 1. Read all file names
    const files: string[] = await fs.readdir(directoryPath);

    // 2. Map filenames to stat promises and resolve them concurrently
    const statPromises = files.map(async (fileName: string) => {
      try {
        const fullPath = path.join(directoryPath, fileName);
        const content = await fs.readFile(fullPath, 'utf-8');
        return { date: extractDateFromPath(fileName), content };
      } catch (error) {
        console.error(`Failed to read ${fileName}:`, (error as Error).message);
        // Return a fallback or throw depending on how you want to handle failures
        return { date: fileName, content: null };
      }
    });

    // 3. Resolve all stats in parallel
    const resolvedResults = await Promise.all(statPromises);

    // Filter out nulls (folders, invalid dates, or unreadable files)
    const validFiles = resolvedResults.filter((item => item.content !== null));

    // 4. Sort by date descending (latest first)
    validFiles.sort().reverse()

    // 5. Slice the top number of days
    return validFiles.slice(0, numberOfDays);

  } catch (error) {
    console.error('Error reading the directory:', error);
    throw error;
  }
}

/**
 * Converts a nested Map into a nested plain object.
 */
function convertNestedMapToObject(nestedMap: Map<string, Map<string, string>>): Record<string, Record<string, string>> {
  // 1. Convert the outer Map entries into an array
  const outerEntries = Array.from(nestedMap.entries()).map(([outerKey, innerMap]) => {
    
    // 2. Convert the inner Map into a plain object using Object.fromEntries
    const innerObject = Object.fromEntries(innerMap);
    
    // 3. Return the outer key paired with the newly created inner object
    return [outerKey, innerObject] as [string, Record<string, string>];
  });

  // 4. Reconstruct the final outer object from the processed entries
  return Object.fromEntries(outerEntries);
}

/**
 * Result structure
 * 
 * track id --- date --- change
 *          --- date --- change
 */
function parseHistoricalResults(latestFiles: FileContentMap[]) {
  const map = new Map<string, Map<string, string>>();

  for (const file of latestFiles) {
    const tracks = JSON.parse(file.content).tracks;

    for (const track of tracks) {
      if (map.has(track.uid)) {
        map.set(track.uid, new Map(map.get(track.uid)?.set(file.date, track.change)))
      } else {
        map.set(track.uid, new Map([[file.date, track.change]]))
      }
    }
  }
  
  return convertNestedMapToObject(map)

}

async function main() {
  console.log('Update historical data...');

  try {

    const latestFiles = await getLatestFiles('./daily', 90);
    const result = parseHistoricalResults(latestFiles);

    // Write to result
    writeToFile(`./historical`, 'tracks.json', JSON.stringify(result))

  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();