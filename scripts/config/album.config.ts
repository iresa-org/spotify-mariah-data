import type { TrackDailyChange } from "./track.config.ts";

export interface AlbumData {
  albumDetails: {
    tracks: string[]
  },
  dailyChanges: TrackDailyChange,
  uri: string;
}