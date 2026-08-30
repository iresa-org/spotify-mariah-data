export type FilterType = 'T' | 'L' | 'S' | 'F' | 'V';

export interface FilterTab {
  label: string;
  value: FilterType;
}

export const TRACK_CATEGORIES: FilterTab[] = [
  { label: 'All', value: 'T' },
  { label: 'Lead', value: 'L' },
  { label: 'Solo', value: 'S' },
  { label: 'Featured', value: 'F' },
  { label: 'Videos', value: 'V' },
];

export interface TrackItem {
  uid: string;
  name?: string;
  playcount: number;
  change: number;
  percent: number | string;
  artists: { uri: string; profile?: { name?: string } }[];
  album?: {
    name?: string;
    coverArt?: { sources?: { url: string }[] };
  };
  firstPublishedAt?: string;
}