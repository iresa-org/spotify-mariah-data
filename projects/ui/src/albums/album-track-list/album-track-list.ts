import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AlbumRecord, AlbumRecordStats, DiscTrackGroup, OrderedAlbumTrack } from '../album.config';
import { AlbumLargeCoverArtPipe } from '../album-pipe';
import {
  GroupedTableComponent,
  GroupedTableCellDirective,
  GroupedTableColumn,
  GroupedTableGroup,
  HistoricDataApi,
  HistoricalData,
  PercentWithSignPipe,
  toNumber,
  FormatCompactPipe,
  formatCompact,
} from 'ui-shared';

interface AlbumTrackTableRow {
  uid: string;
  rank: number | '-';
  trackName: string;
  total: number;
  daily: number;
  change: number;
}

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
  selector: 'lib-album-track-list',
  imports: [
    AlbumLargeCoverArtPipe,
    DatePipe,
    DecimalPipe,
    NgxChartsModule,
    GroupedTableComponent,
    GroupedTableCellDirective,
    PercentWithSignPipe,
    FormatCompactPipe
  ],
  templateUrl: './album-track-list.html',
  styleUrl: './album-track-list.scss',
})
export class AlbumTrackList {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly historicDataApi = inject(HistoricDataApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedAlbum = input<AlbumRecord | null>(null);
  readonly recordStats = input<AlbumRecordStats>({
    allTime: null,
    year: null,
    allTimeStatus: 'loading',
    yearStatus: 'loading',
  });

  readonly albumClosed = output<void>();
  readonly historicalData = signal<HistoricalData | null>(null);
  readonly historyStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly historyWindowOptions: readonly HistoryWindow[] = [7, 30, 60, 90];
  readonly selectedHistoryWindow = signal<HistoryWindow>(7);

  readonly historicalSeries = computed<SeriesPoint[]>(() => {
    const album = this.selectedAlbum();
    const historical = this.historicalData();
    if (!album || !historical) return [];

    const dailyTotals = new Map<string, number>();
    for (const track of album.albumDetails.tracks) {
      const trackHistory = historical[track.uid];
      if (!trackHistory) continue;

      for (const [date, count] of Object.entries(trackHistory)) {
        dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + toNumber(count));
      }
    }

    return Array.from(dailyTotals, ([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly historicalChart = computed<ChartSeries[]>(() => {
    const series = this.historicalSeries();
    if (series.length === 0) return [];

    return [{
      name: `Daily Streams (${this.selectedHistoryWindow()} Days)`,
      series: series.slice(-this.selectedHistoryWindow()),
    }];
  });

  readonly colorScheme: Color = {
    name: 'mariah-line',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#d72652'],
  };

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      if (this.selectedAlbum() && this.historyStatus() === 'idle') {
        this.loadHistoricalData();
      }
    });
  }

  closeAlbum() {
    this.albumClosed.emit();
  }

  setHistoryWindow(days: HistoryWindow): void {
    this.selectedHistoryWindow.set(days);
  }

  yAxisTickFormat = (value: number) => formatCompact(value);

  xAxisTickFormat = (value: string) => {
    if (!value || value.length < 7) return value;
    return value.slice(5);
  };

  private loadHistoricalData(): void {
    this.historyStatus.set('loading');
    this.historicDataApi.loadHistorical()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: historical => {
          this.historicalData.set(historical);
          this.historyStatus.set('loaded');
        },
        error: () => this.historyStatus.set('error'),
      });
  }

  readonly albumTrackGroups = computed<DiscTrackGroup[]>(() => {
    const album = this.selectedAlbum();
    if (!album) return [];

    const orderedTracks = album.albumDetails.tracks
      .filter(track => !!track)
      .map((track, index) => {
        const normalizedDisc = toNumber(track.discNumber ?? 1);
        const normalizedTrack = toNumber(track.trackNumber ?? (index + 1));

        return {
          ...track,
          originalOrder: index + 1,
          disc: normalizedDisc,
          track: normalizedTrack,
        };
      })
      .sort((a, b) => {
        if (a.disc !== b.disc) return a.disc - b.disc;
        if (a.track !== b.track) return a.track - b.track;
        return a.originalOrder - b.originalOrder;
      });

    const groups = new Map<number, OrderedAlbumTrack[]>();
    for (const track of orderedTracks) {
      const existing = groups.get(track.disc) ?? [];
      existing.push(track);
      groups.set(track.disc, existing);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([discNumber, tracks]) => ({ discNumber, tracks }));
  });

  readonly hasMultipleDiscs = computed(() => this.albumTrackGroups().length > 1);

  readonly tableColumns: ReadonlyArray<GroupedTableColumn<AlbumTrackTableRow>> = [
    { id: 'rank', header: '#', width: '44px', value: (row) => row.rank },
    { id: 'trackName', header: 'Track', width: '320px', value: (row) => row.trackName },
    { id: 'total', header: 'Total', width: '112px', align: 'end', value: (row) => row.total },
    { id: 'daily', header: 'Daily', width: '112px', align: 'end', value: (row) => row.daily },
    { id: 'change', header: 'Change', width: '112px', align: 'end', value: (row) => row.change },
  ];

  readonly tableGroups = computed<ReadonlyArray<GroupedTableGroup<AlbumTrackTableRow>>>(() => {
    const album = this.selectedAlbum();
    if (!album) return [];

    const groups = this.albumTrackGroups();
    const groupedRows = groups.map((group) => ({
      id: group.discNumber,
      label: this.hasMultipleDiscs() ? `Disc ${group.discNumber}` : '',
      rows: group.tracks.map((track) => this.toTableRow(track)),
      collapsedSummaryRows: [this.toDiscSummaryRow(group)],
    }));

    const summaryRow: AlbumTrackTableRow = {
      uid: `${album.albumDetails.uri}-summary`,
      rank: '-',
      trackName: 'Total',
      total: toNumber(album.dailyChanges.count),
      daily: toNumber(album.dailyChanges.change),
      change: toNumber(album.dailyChanges.percentChange),
    };

    return [
      ...groupedRows,
      {
        id: 'summary',
        label: '',
        rows: [summaryRow],
      },
    ];
  });

  private toTableRow(track: OrderedAlbumTrack): AlbumTrackTableRow {
    return {
      uid: track.uid,
      rank: track.track,
      trackName: track.name,
      total: toNumber(track.playcount),
      daily: toNumber(track.change),
      change: toNumber(track.percent),
    };
  }

  private toDiscSummaryRow(group: DiscTrackGroup): AlbumTrackTableRow {
    const total = group.tracks.reduce((sum, track) => sum + toNumber(track.playcount), 0);
    const daily = group.tracks.reduce((sum, track) => sum + toNumber(track.change), 0);
    const weightedPercent = group.tracks.reduce(
      (sum, track) => sum + toNumber(track.playcount) * toNumber(track.percent),
      0,
    );

    return {
      uid: `${group.discNumber}-summary`,
      rank: '-',
      trackName: `Disc ${group.discNumber} total`,
      total,
      daily,
      change: total > 0 ? weightedPercent / total : 0,
    };
  }
}
