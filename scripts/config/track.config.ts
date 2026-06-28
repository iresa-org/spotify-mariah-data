import { ContentItem } from "./source.config.ts";

/**
 * S: Solo
 * F: Featured
 * L: Lead
 * V: Video
 */
export type TrackCategory = 'S' | 'F' | 'L' | 'V';

export interface BaseDailyChange {
  playCount: string;
  change: string;
  percentChange?: string;
}

export interface TrackDailyChange extends BaseDailyChange {
  prevChange?: string;
}

export interface TrackData {
  trackDetails: ContentItem,
  dailyChanges: TrackDailyChange,
  categories: TrackCategory[];
  countMerged?: boolean;
}

export interface AlbumData {
  albumDetails: {
    tracks: string[]
  },
  dailyChanges: TrackDailyChange,
}

export interface PlayCountOutput {
  total: BaseDailyChange;
  lead: BaseDailyChange;
  solo: BaseDailyChange;
  featured: BaseDailyChange;
  videos: BaseDailyChange;

}

export interface GetTrackDetailResp {
  tracks: TrackData[];
  playCounts: PlayCountOutput,
  albums: AlbumData[];
  lastUpdate: string;
}

export interface DailyCountOutput {
  tracks: {
    uid: string;
    playCount: string;
    change: string;
  }[];
  playCounts: PlayCountOutput
}