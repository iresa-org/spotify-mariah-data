export interface TrackArtists {
  items: { profile: { name: string } }[]
}

export interface TrackContentItem {
  uid: string;
  itemV2: {
    data: {
      name?: string;
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

export interface ArtistContentItem {
  discography: {
    topTracks: {
      items: {
        uid: string;
        track: TrackContentItem['itemV2']['data']
      }[]
    }
  },
  stats: {
    followers: number,
    monthlyListeners: number
  }
}

export interface SpotifyTrackData {
  data: {
    playlistV2: {
      content: {
        items: TrackContentItem[]
      }
    }
  }
}

export interface SpotifyArtistData {
  data: {
    artistUnion: ArtistContentItem
  }
}

export type SpotifyContentData = SpotifyTrackData | SpotifyArtistData;