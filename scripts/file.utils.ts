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
    const items = await fs.readdir(targetDir);

    let latestFile: string | null = null;
    let latestMtime = 0; // Epoch time placeholder

    // 2. Iterate through each item to find the latest file
    const promises = [];
    const selectedItems: string[] = [];

    for (const item of items) {
      if (!acceptedExt.length || acceptedExt.some(ext => item.includes(ext))) {
        const fullPath = path.join(targetDir, item);
        promises.push(fs.stat(fullPath));
        selectedItems.push(item)
      }
    }

    const results = await Promise.all(promises);
    results.forEach((stats, i) => {
      // Only check files, ignore sub-directories
      if (stats.isFile()) {
        const fileMtime = stats.mtime.getTime();

        if (fileMtime > latestMtime) {
          latestMtime = fileMtime;
          latestFile = path.join(targetDir, selectedItems[i] ?? '');
        }
      }
    })
    return latestFile;
  } catch (error) {
    console.error(`Error reading directory "${targetDir}":`, error);
    throw error;
  }
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