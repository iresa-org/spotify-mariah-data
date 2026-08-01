import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { DailyDataApi, HistoricDataApi, HistoricalData, TrackRecord, YtdData } from 'ui-shared';
import { TRACK_CATEGORIES } from '../tracks.config';
import { GetTrackCategoryPipe } from '../get-track-category-pipe';

interface SeriesPoint {
  name: string;
  value: number;
}

interface ChartSeries {
  name: string;
  series: SeriesPoint[];
}

type HistoryWindow = 7 | 30 | 60 | 90;

@Component({
  selector: 'lib-track-detail',
  imports: [NgxChartsModule, RouterLink, GetTrackCategoryPipe],
  templateUrl: './track-detail.html',
  styleUrl: './track-detail.scss',
})
export class TrackDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);

  readonly uid = signal('');
  readonly track = computed(() => this.dailyDataApi.getTrackByUid(this.uid()));
  readonly loading = signal(true);

  readonly categories = TRACK_CATEGORIES;

  readonly allTimeRecord = signal<TrackRecord | null>(null);
  readonly ytdRecord = signal<TrackRecord | null>(null);
  readonly ytdTotal = signal<string | null>(null);
  readonly historyWindowOptions: readonly HistoryWindow[] = [7, 30, 60, 90];
  readonly selectedHistoryWindow = signal<HistoryWindow>(7);
  readonly historicalSeries = signal<SeriesPoint[]>([]);
  readonly historicalChart = computed<ChartSeries[]>(() => {
    const series = this.historicalSeries();
    if (series.length === 0) return [];

    const days = this.selectedHistoryWindow();
    const categorizedSeries = series.slice(-days);
    return [{ name: `Daily Streams (${days} Days)`, series: categorizedSeries }];
  });

  readonly colorScheme: Color = {
    name: 'mariah-line',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#d72652'],
  };

  ngOnInit(): void {
    const uid = this.route.snapshot.paramMap.get('uid') ?? '';
    this.uid.set(uid);

    forkJoin({
      allTime: this.historicDataApi.loadAllTimeRecords(),
      ytdRec: this.historicDataApi.loadYtdRecords(),
      ytd: this.historicDataApi.loadYtd(),
      historical: this.historicDataApi.loadHistorical(),
    }).subscribe({
      next: ({ allTime, ytdRec, ytd, historical }) => {
        const allTimeMap = new Map(Object.entries(allTime));
        this.allTimeRecord.set(allTimeMap.get(uid) ?? null);

        const ytdRecMap = new Map(Object.entries(ytdRec));
        this.ytdRecord.set(ytdRecMap.get(uid) ?? null);

        const ytdEntry = (ytd as YtdData).tracks.find(t => t.uid === uid);
        this.ytdTotal.set(ytdEntry?.ytd ?? null);

        this.historicalSeries.set(this.buildSeries(uid, historical));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildSeries(uid: string, historical: HistoricalData): SeriesPoint[] {
    const trackHistory = historical[uid];
    if (!trackHistory) return [];

    return Object.entries(trackHistory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ name: date, value: +count }));
  }

  setHistoryWindow(days: HistoryWindow): void {
    this.selectedHistoryWindow.set(days);
  }

  getAlbumArt(track: { album?: { coverArt?: { sources?: { url: string }[] } } }): string {
    return track.album?.coverArt?.sources?.[0]?.url ?? '';
  }

  formatCompact(value: number | string): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(+value);
  }

  formatNumber(value: number | string): string {
    return new Intl.NumberFormat('en-US').format(+value);
  }

  yAxisTickFormat = (val: number) => this.formatCompact(val);

  /** Show only month-day portion for x-axis labels to avoid crowding */
  xAxisTickFormat = (val: string) => {
    if (!val || val.length < 7) return val;
    return val.slice(5); // e.g. "2026-07-13" → "07-13"
  };
}
