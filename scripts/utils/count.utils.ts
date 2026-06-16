import type { ContentItem, TrackArtists, TrackCategory, TrackDailyChange, TrackData } from "../config/track.config.ts";

function getDuplicates(map: Map<string, string[]>): Set<string> {
  const arr: string[] = [];
  for (let [_, value] of map) {
    if (value.length > 1) {
      const [_, ...rest] = value;
      arr.push(...rest)
    }
  }

  return new Set(arr);
}

export function getAll(list: TrackData[]) {
  const countIdMap = new Map<string, string[]>();

  list.forEach(item => {
    const playCount = item.dailyChanges.playCount;
    if (!countIdMap.has(playCount)) {
      countIdMap.set(item.dailyChanges.playCount, [item.trackDetails.uid])
    } else {
      countIdMap.set(item.dailyChanges.playCount, [...countIdMap.get(playCount)!, item.trackDetails.uid])
    }
  })
  const duplicates = getDuplicates(countIdMap);
  return list.filter(item => !duplicates.has(item.trackDetails.uid));
}

export function getTotalStreams(list: TrackData[]): string {
  return String(list.reduce((total, item) => total + BigInt(item.dailyChanges.playCount), BigInt(0)));
}

export function calcDailyChanges(item: ContentItem, prevMap: Map<string, TrackDailyChange>): TrackDailyChange {
  const { uid, itemV2 } = item;
  let prevTotal = BigInt(0), prevChange = BigInt(0);
  if (prevMap.has(uid)) {
    const prev = prevMap.get(uid);
    prevTotal = BigInt(prev!.playCount);
    prevChange = BigInt(prev!.change);
  }
  const currTotal = itemV2?.data?.playcount || 0;
  const change = BigInt(currTotal) - BigInt(prevTotal);

  return {
    playCount: String(currTotal),
    change: String(change),
    prevChange: String(prevChange)
  }
}

function containsMainArtist(artists: TrackArtists): boolean {
  const artistName = artists.items[0]?.profile.name;
  return !!artists.items && !!artistName?.includes('Mariah Carey')
}

export function getTrackCategories(item: ContentItem): TrackCategory[] {
  const categories: TrackCategory[] = []
  const artists = item.itemV2.data.artists;

  if (containsMainArtist(artists)) {
    categories.push('L')
  }
  if (containsMainArtist(artists) && artists.items.length === 1) {
    categories.push('S')
  }
  if (artists.items.length > 1 && !containsMainArtist(artists)) {
    categories.push('F')
  }
  if (item.itemV2.data.mediaType.includes('VIDEO')) {
    categories.push('V')
  }

  return categories
}