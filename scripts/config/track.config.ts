import type { TrackContentItem } from "./source.config.ts";

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
  trackDetails: TrackContentItem,
  dailyChanges: TrackDailyChange,
  categories: TrackCategory[];
  countMerged?: boolean;
}