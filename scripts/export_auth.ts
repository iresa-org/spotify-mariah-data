import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchSpotifyChartsContext } from './auth.ts';

const OUTPUT_PATH = process.env.SPOTIFY_CHARTS_STORAGE_STATE_PATH
  ?? path.join(process.cwd(), 'auth/spotify-charts-auth.txt');

export async function exportSpotifyChartsAuth(): Promise<void> {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const context = await launchSpotifyChartsContext();
  let storageState: string;

  try {
    storageState = JSON.stringify(await context.storageState());
  } finally {
    await context.close();
  }

  await writeFile(OUTPUT_PATH, storageState, 'utf8');
  console.log(storageState);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  exportSpotifyChartsAuth().catch((error: unknown) => {
    console.error('Spotify Charts auth export failed:', error);
    process.exitCode = 1;
  });
}