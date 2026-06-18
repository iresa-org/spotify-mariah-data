/**
 * S: Solo
 * F: Featured
 * L: Lead
 * V: Video
 */
export type TrackCategory = 'S' | 'F' | 'L' | 'V';

export interface TrackArtists {
  items: { profile: { name: string } }[]
}

export interface ContentItem {
  uid: string;
  itemV2: {
    data: {
      playcount: string;
      artists: TrackArtists;
      mediaType: string;
      albumOfTrack: {
        name: string;
        uri: string
      },
      discNumber: number;
      trackNumber: number;
    }
  }
}

export interface BaseDailyChange {
  playCount: string;
  change: string;
  percentChange?: string;
}

export interface TrackDailyChange extends BaseDailyChange {
  prevChange?: string;
}

export interface SpotifyTrackData {
  data: {
    playlistV2: {
      content: {
        items: ContentItem[]
      }
    }
  }
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