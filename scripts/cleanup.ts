import { readdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const DAYS_TO_KEEP = 90;
const DAILY_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function cleanup(rootDir = process.cwd(), dryRun = false): Promise<string[]> {
  const dailyDir = path.join(rootDir, 'daily');
  const ytdDir = path.join(rootDir, 'ytd');

  const dailyFiles = (await listFiles(dailyDir)).filter((name) => DAILY_FILE_PATTERN.test(name)).sort();
  const staleDaily = dailyFiles.slice(0, Math.max(0, dailyFiles.length - DAYS_TO_KEEP));

  const targets = [
    ...staleDaily.map((name) => path.join(dailyDir, name)),
    ...(await listFiles(path.join(rootDir, 'records')))
      .filter((name) => name === 'year.json')
      .map((name) => path.join(rootDir, 'records', name)),
    ...(await listFiles(ytdDir)).map((name) => path.join(ytdDir, name)),
  ];

  for (const target of targets) {
    console.log(`${dryRun ? '[dry-run] would delete' : 'delete'} ${path.relative(rootDir, target)}`);
    if (!dryRun) await rm(target, { force: true });
  }

  console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${targets.length} file(s); kept ${dailyFiles.length - staleDaily.length} daily file(s).`);
  return targets;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cleanup(process.cwd(), process.argv.includes('--dry-run')).catch((error: unknown) => {
    console.error('Cleanup failed:', error);
    process.exitCode = 1;
  });
}
