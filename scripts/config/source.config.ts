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

export interface SpotifyTrackData {
  data: {
    playlistV2: {
      content: {
        items: ContentItem[]
      }
    }
  }
}