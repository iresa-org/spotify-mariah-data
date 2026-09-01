import { NumericLike } from "ui-shared";


export interface CoverSource {
  url: string;
  height?: number;
}

export interface AlbumTrack {
  uid: string;
  name: string;
  playcount: NumericLike;
  change: NumericLike;
  percent: NumericLike;
  discNumber?: NumericLike;
  trackNumber?: NumericLike;
  artists?: { uri: string; profile?: { name?: string } }[];
  album?: { coverArt?: { sources?: CoverSource[] } };
}

export interface AlbumRecord {
  albumDetails: {
    name: string;
    uri: string;
    coverArt?: { sources?: CoverSource[] };
    tracks: AlbumTrack[];
    date?: { isoString?: string };
  };
  dailyChanges: {
    count: NumericLike;
    change: NumericLike;
    percentChange: NumericLike;
  };
}

export interface OrderedAlbumTrack extends AlbumTrack {
  originalOrder: number;
  disc: number;
  track: number;
}

export interface DiscTrackGroup {
  discNumber: number;
  tracks: OrderedAlbumTrack[];
}