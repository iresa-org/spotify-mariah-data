import { SELECTED_ALBUMS } from "../config/album.config.ts";
import type { AlbumData, BaseDailyChange, ContentItem, TrackArtists, TrackCategory, TrackDailyChange, TrackData } from "../config/track.config.ts";

export function compareNumbers(number1: number | string, number2: number | string): boolean {
  return Boolean(Number(number1) - Number(number2));
}

export function addNumbers(number1: string, number2: string): BigInt {
  return BigInt(number1) + BigInt(number2) 
}

export function subtractNumbers(number1: string, number2: string): BigInt {
  return BigInt(number2) - BigInt(number1) 
}

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

export function getDuplicateIds(list: TrackData[]) {
  const countIdMap = new Map<string, string[]>();

  list.forEach(item => {
    const playCount = item.dailyChanges.playCount;
    if (!countIdMap.has(playCount)) {
      countIdMap.set(item.dailyChanges.playCount, [item.trackDetails.uid])
    } else {
      countIdMap.set(item.dailyChanges.playCount, [...countIdMap.get(playCount)!, item.trackDetails.uid])
    }
  })

  return getDuplicates(countIdMap);
}

export function getTotalStreams(list: TrackData[]): BaseDailyChange {
  const prevChange = list.reduce((total, item) => total + BigInt(item.dailyChanges.prevChange ?? 0), BigInt(0));
  const newSum = list.reduce((total, item) => total + BigInt(item.dailyChanges.playCount), BigInt(0));
  const newChange = list.reduce((total, item) => total + BigInt(item.dailyChanges.change), BigInt(0));

  return {
    playCount: String(newSum),
    change: String(newChange),
    percentChange: String(calcPercentChange(prevChange, newChange))
  }
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
  const percentChange = calcPercentChange(prevChange, change)

  return {
    playCount: String(currTotal),
    change: String(change),
    prevChange: String(prevChange),
    percentChange: String(percentChange)
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

export function calcPercentChange(prevChange: BigInt, newChange: BigInt): number {
  return Number(prevChange) ? (Number(newChange) - Number(prevChange)) / Number(prevChange) : 0

}

export function convertToAlbumList(map: Map<string, TrackData[]>): AlbumData[] {
  const arr: AlbumData[] = [];
  for (let [_, value] of map) {
    const playcount = value.reduce((sum, item) => sum + BigInt(item.dailyChanges.playCount), BigInt(0));
    const change = value.reduce((sum, item) => sum + BigInt(item.dailyChanges.change), BigInt(0));
    const prevChange = value.reduce((sum, item) => sum + BigInt(item.dailyChanges.prevChange ?? 0), BigInt(0));
    const percentChange = calcPercentChange(prevChange, change)
    const firstTrack = value[0];
    arr.push({
      albumDetails: {
        ...firstTrack?.trackDetails.itemV2.data.albumOfTrack,
        tracks: value.map(item => item.trackDetails.uid),
      },
      dailyChanges: {
        playCount: String(playcount),
        change: String(change),
        percentChange: String(percentChange)
      }
    })
  }
  return arr;
}

export function filterAlbums(map: Map<string, any[]>): Map<string, any[]> {
  const albumMap = new Map<string, any[]>();
  const selectedSet = new Set(SELECTED_ALBUMS);

  for (let [key, value] of map) {
    if (selectedSet.has(key)) {
      albumMap.set(key, value)
    }
  }

  return albumMap;
}

export function getAlbumsFromTracks(currTrackMap: Map<string, TrackData>): Map<string, TrackData[]> {

  const albumMap = new Map<string, TrackData[]>();
  for (let [_, value] of currTrackMap) {
    const album = value.trackDetails.itemV2.data.albumOfTrack;
    albumMap.has(album.uri) ?
      albumMap.set(album.uri, sortTracksOnAlbum([...albumMap.get(album.uri)!, value])) :
      albumMap.set(album.uri, [value])
  }
  return albumMap
}

export function sortTracksOnAlbum(list: TrackData[]): any[] {
  return list.sort((a, b) => {
    const item1 = a.trackDetails.itemV2.data;
    const item2 = b.trackDetails.itemV2.data;
    return item1.discNumber - item2.discNumber || item1.trackNumber - item2.trackNumber
  })
}

export function calculateSum(arr: string[]): string {
  let total = BigInt(0);
  
  for (const num of arr) {
    total += BigInt(num);
  }
  
  return String(total);
}