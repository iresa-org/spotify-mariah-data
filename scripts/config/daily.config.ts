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
  artist: ArtistContentItem | null,
  monthlyListeners: BaseDailyChange,
  followers: BaseDailyChange,
  topTracks: { uid: string, diff: string }[]
}

export interface DailyCountOutput {
  tracks: {
    uid: string;
    count: string;
    change: string;
  }[];
  playCounts: PlayCountOutput,
  monthlyListeners: string,
  followers: string,
  albums: AlbumData[];
  topTracks: {
    uid: string;
  }[]
}