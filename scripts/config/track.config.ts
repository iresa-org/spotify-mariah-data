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
    }
  }
}

export interface TrackDailyChange {
  playCount: string;
  change: string;
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

export interface GetTrackDetailResp {
  tracks: TrackData[];
  playCounts: {
    total: string;
    lead: string;
    solo: string;
    featured: string;
    video: string
  }
}