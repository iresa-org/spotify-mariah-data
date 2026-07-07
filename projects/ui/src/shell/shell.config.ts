export type Kpi = {
  readonly label: string;
  readonly value: number;
  readonly delta: number;
};

export type MonthlyStreams = {
  readonly month: string;
  readonly streamsInMillions: number;
};

export type TopTrack = {
  readonly title: string;
  readonly album: string;
  readonly streams: number;
  readonly growth: number;
};