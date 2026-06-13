export interface ContentItem {
  uid: string;
  itemV2: {
    data: {
      playcount: string;
    }
  }
}

export interface TrackDailyChange {
  currTotal: string;
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
  org: ContentItem,
  dailyChanges: TrackDailyChange
}