import { promises as fs } from 'fs';
import * as path from 'path';
import { writeFile, readdir, unlink, stat, access } from 'fs/promises';

/**
 * Finds the file with the latest modification timestamp in a given directory.
 * @param targetDir The directory path to scan.
 * @returns The absolute path of the latest file, or null if no files are found.
 */
export async function getLatestFile(targetDir: string, acceptedExt: string[] = []): Promise<string | null> {
  try {
    // 1. Read all items inside the directory
    const items: string[] = await fs.readdir(targetDir);

    // 2. Sort list by descending order
    const list = items.filter(item => !acceptedExt.length || acceptedExt.some(ext => item.includes(ext))).sort().reverse()

    return list.length ? path.join(targetDir, list[0] ?? '') : null
  } catch (error) {
    console.error(`Error reading directory "${targetDir}":`, error);
  }
  return Promise.resolve(null)
}

/**
 * Finds the file with the latest modification timestamp in a given directory.
 * @param targetDir The directory path to scan.
 * @returns The absolute path of the latest file, or null if no files are found.
 */
export async function getOldestFile(targetDir: string, acceptedExt: string[] = []): Promise<string | null> {
  try {
    // 1. Read all items inside the directory
    const items: string[] = await fs.readdir(targetDir);

    // 2. Sort list by descending order
    const list = items.filter(item => !acceptedExt.length || acceptedExt.some(ext => item.includes(ext))).sort()

    return list.length ? path.join(targetDir, list[0] ?? '') : null
  } catch (error) {
    console.error(`Error reading directory "${targetDir}":`, error);
  }
  return Promise.resolve(null)
}

export async function writeToFile(dir: string, fileName: string, data: string) {
  const filePath = path.join(dir, fileName);

  try {
    // 1. Check if the file already exists
    // 'access' throws an error if the file does NOT exist
    await access(filePath);

    writeDataToFile(filePath, data)

  } catch (error: any) {
    // 2. If the error code is 'ENOENT', it means the file does not exist (which is what we want)
    if (error.code === 'ENOENT') {
      writeDataToFile(filePath, data)
    } else {
      // Handle other potential errors (like permission issues 'EACCES')
      console.error(`Unexpected error checking file: ${error.message}`);
    }
  }
}

async function writeDataToFile(filePath: string, data: string) {
  try {
    await writeFile(filePath, data, 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}

/**
 * Clears all files inside a specific directory.
 * @param directoryPath The path to the folder you want to clear.
 */
export async function clearFilesFromFolder(directoryPath: string, extExcluded: string[] = []): Promise<void> {
  try {
    // 1. Read all contents of the directory
    const files = await readdir(directoryPath);

    // 2. Loop through each item in the directory
    for (const file of files) {
      if (extExcluded.length && extExcluded.some(ext => file.includes(ext))) {
        continue;
      }
      const fullPath = path.join(directoryPath, file);
      const fileStat = await stat(fullPath);

      // 3. Make sure it's a file before deleting (prevents accidentally deleting subfolders)
      if (fileStat.isFile()) {
        await unlink(fullPath);
        console.log(`Deleted file: ${file}`);
      }
    }

    console.log(`Successfully cleared files from: ${directoryPath}`);
  } catch (error) {
    console.error(`Error clearing folder:`, error);
  }
}