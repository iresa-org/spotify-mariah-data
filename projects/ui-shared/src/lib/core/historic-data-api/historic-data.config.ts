export interface MonthData {
  month: string;
  total: string;
}

export interface MonthlyData {
  months: MonthData[];
}

export interface TrackRecord {
  uid: string;
  change: string;
  date: string;
}

export interface YtdEntry {
  uid: string;
  ytd: string;
}

export interface YtdData {
  tracks: YtdEntry[];
}

/** uid → { date → streamCount } */
export type HistoricalData = Record<string, Record<string, string>>;
