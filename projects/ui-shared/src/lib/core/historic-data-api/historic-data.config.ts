export interface MonthData {
  month: string;
  total: string;
}

export interface MonthlyData {
  months: MonthData[];
}

export interface RecordData {
  tracks: RecordEntry;
  albums: RecordEntry;
}

export type RecordEntry = Record<string, { change: string; date: string }>;

export type YtdEntry = Record<string, string>;

export interface YtdData {
  tracks: YtdEntry;
  albums: YtdEntry;
}

/** uid → { date → streamCount } */
export type HistoricalData = Record<string, Record<string, string>>;
