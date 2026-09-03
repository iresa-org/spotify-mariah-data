import { appendFile, readFile } from 'fs/promises';
import { getLatestFile } from './utils/file.utils.ts';
import { fetchMonthlyListeners } from './utils/monthly-listeners.utils.ts';

async function getLatestRecordedListeners(): Promise<number> {
  const dailyPath = await getLatestFile('./daily', ['.json']);
  if (!dailyPath) {
    throw new Error('No daily data file was found');
  }

  const dailyData = JSON.parse(await readFile(dailyPath, 'utf8')) as { monthlyListeners?: string };
  const monthlyListeners = Number(dailyData.monthlyListeners);
  if (!Number.isFinite(monthlyListeners)) {
    throw new Error(`Invalid monthlyListeners in ${dailyPath}`);
  }
  return monthlyListeners;
}

async function checkOnce(previousListeners: number): Promise<boolean> {
  const currentListeners = await fetchMonthlyListeners();

  console.log(`Monthly listeners: ${currentListeners} (previously ${previousListeners})`);
  if (currentListeners === previousListeners) {
    return false;
  }

  const change = currentListeners - previousListeners;
  console.log(`Monthly listeners changed by ${change >= 0 ? '+' : ''}${change.toLocaleString()}.`);
  return true;
}

async function main() {
  const previousListeners = await getLatestRecordedListeners();

  try {
    const changed = await checkOnce(previousListeners);
    if (changed && process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, 'changed=true\n');
    }
  } catch (error) {
    console.error('Monthly listener check failed:', error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Monthly listener monitor stopped:', error);
  process.exitCode = 1;
});