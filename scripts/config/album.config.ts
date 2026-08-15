import type { TrackDailyChange } from "./track.config.ts";

export interface AlbumData {
  albumDetails: {
    name?: string;
    tracks: string[]
  },
  dailyChanges: TrackDailyChange,
  uri: string;
}