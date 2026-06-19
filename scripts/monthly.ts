import { promises as fs } from 'fs';
import { writeToFile } from "./utils/file.utils.ts";
import type { DailyCountOutput, PlayCountOutput } from './config/track.config.ts';
import * as path from 'path';
import { calculateSum } from './utils/count.utils.ts';

function cleanMapInPlace(map: Map<any, any>): Map<any, any> {
  for (const [key, value] of map.entries()) {
    // Check if value is null/undefined OR an empty array
    if (
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    ) {
      map.delete(key);
    }
  }
  return map;
}

async function readFilesMap(fileList: string[]): Promise<Map<string, DailyCountOutput>> {
  // 1. Map each config to an async promise payload
  const promises = fileList.map(async (filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { key: filePath, content };
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, (error as Error).message);
      // Return a fallback or throw depending on how you want to handle failures
      return { key: filePath, content: `Error: Could not read file` };
    }
  });

  // 2. Resolve all file reads concurrently
  const resolvedFiles = await Promise.all(promises);

  // 3. Convert the array of results into a key-value object map
  const results = new Map<string, DailyCountOutput>();
  for (const file of resolvedFiles) {
    results.set(file.key, JSON.parse(file.content));
  }

  return results;
}


async function calculateMonthlySum(map: Map<string, string[]>): Promise<Map<string, string>> {

  const groups = new Map<string, string>();

  // Flattens one level deep by default
  const files = Array.from(map.values()).flat();

  // read all files
  const fileContents = await readFilesMap(files)

  // calc sum of each month
  for (let [key, days] of map) {
    const playCounts = calculateSum(days.map(day => fileContents.get(day)?.playCounts.total.change ?? '0'))
    groups.set(key, playCounts);
  }
  return groups;
}

async function groupFilesByMonth(directoryPath: string): Promise<Map<string, string[]>> {
  // Initialize the groups for months 01 through 12
  const groups = new Map<string, string[]>();
  for (let i = 1; i <= 12; i++) {
    const monthKey = i.toString().padStart(2, '0'); // "01", "02", ..., "12"
    groups.set(monthKey, []);
  }

  try {
    // Read all files in the given directory
    const files = await fs.readdir(directoryPath);

    // Regular expression to match YYYY-MM-DD at the start of the filename
    // Example matches: "2026-06-19.txt", "2023-12-01.jpg", "2025-01-15"
    const dateRegex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/;

    for (const file of files) {
      const match = file.match(dateRegex);

      if (match) {
        // match[2] captures the MM (month) part of the regex
        const month = match[2];
        if (month && groups.has(month)) {
          const arr = groups.get(month)!;
          groups.set(month, [...arr, path.join(directoryPath, file)])
        }
      } else {
        console.log(`Skipped (Invalid Format): ${file}`);
      }
    }
  } catch (error) {
    console.error(`Error reading directory: ${(error as Error).message}`);
  }

  return cleanMapInPlace(groups);
}

async function main() {
  console.log('Calculating monthly...');

  try {

    const groups = await groupFilesByMonth('./daily');
    const results = await calculateMonthlySum(groups);

    const months = Array.from(results, ([month, total]) => ({
      month,
      total
    }));

    writeToFile(`./ytd`, 'monthly.json', JSON.stringify({ months }))
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

// Run the script
main();