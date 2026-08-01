import { AlbumData } from "./album.config.ts";
import { ArtistContentItem } from "./source.config.ts";
import { BaseDailyChange, TrackData } from "./track.config.ts";

export interface PlayCountOutput {
  total: BaseDailyChange;
  lead: BaseDailyChange;
  solo: BaseDailyChange;
  featured: BaseDailyChange;
  videos: BaseDailyChange;
}

export interface GetDailyResult {
  tracks: TrackData[];
  playCounts: PlayCountOutput,
  albums: AlbumData[];
  lastUpdate: string;
  artist: ArtistContentItem | null
}

export interface DailyCountOutput {
  tracks: {
    uid: string;
    playCount: string;
    change: string;
  }[];
  playCounts: PlayCountOutput,
  monthlyListeners: number,
  albums: AlbumData[];
}