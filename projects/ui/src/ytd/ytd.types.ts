export interface YtdTrack {
  uid: string;
  name: string;
  albumName: string;
  ytdCount: number;
  coverArt?: string;
}

export interface AlbumYtd {
  uri: string;
  name: string;
  ytdCount: number;
  image?: string;
}

export interface PeriodOption {
  value: string;
  label: string;
}
