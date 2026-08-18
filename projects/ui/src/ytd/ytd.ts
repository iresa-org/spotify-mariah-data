import { CommonModule, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { forkJoin, fromEvent, map, startWith } from 'rxjs';
import { DailyDataApi, FormatCompactPipe, HistoricDataApi, YtdData } from 'ui-shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface YtdTrack {
  uid: string;
  name: string;
  albumName: string;
  ytdCount: number;
  coverArt?: string;
}

interface AlbumYtd {
  uri: string;
  name: string;
  ytdCount: number;
  image?: string;
}

interface PeriodOption {
  value: string;
  label: string;
}

const YTD_PERIOD = 'ytd';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Component({
  selector: 'lib-ytd',
  standalone: true,
  imports: [CommonModule, FormatCompactPipe, ScrollingModule, NgOptimizedImage],
  templateUrl: './ytd.html',
  styleUrl: './ytd.scss',
})
export class Ytd implements OnInit {
  private readonly dailyDataApi = inject(DailyDataApi);
  private readonly historicDataApi = inject(HistoricDataApi);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ytdData = signal<YtdData | null>(null);
  private readonly trackMeta = signal(new Map<string, YtdTrack>());
  private readonly albumMeta = signal(new Map<string, { name: string; image?: string }>());

  readonly loading = signal(true);
  readonly showScrollToTop = signal(false);
  readonly selectedPeriod = signal(YTD_PERIOD);

  readonly periodOptions = computed<PeriodOption[]>(() => {
    const months = Object.keys(this.ytdData()?.monthly ?? {}).sort();
    return [
      { value: YTD_PERIOD, label: 'YTD (entire year)' },
      ...months.map((month) => ({
        value: month,
        label: MONTH_NAMES[Number(month) - 1] ?? month,
      })),
    ];
  });

  readonly periodLabel = computed(
    () => this.periodOptions().find((option) => option.value === this.selectedPeriod())?.label ?? ''
  );

  readonly isYtdPeriod = computed(() => this.selectedPeriod() === YTD_PERIOD);

  private readonly selectedTotals = computed(() => {
    const data = this.ytdData();
    if (!data) return null;
    const period = this.selectedPeriod();
    return period === YTD_PERIOD ? data.ytd : (data.monthly?.[period] ?? null);
  });

  readonly topTracks = computed<YtdTrack[]>(() => {
    const totals = this.selectedTotals();
    if (!totals) return [];
    const meta = this.trackMeta();
    return Object.entries(totals.tracks ?? {})
      .map(([uid, count]) => ({
        uid,
        name: meta.get(uid)?.name ?? '',
        albumName: meta.get(uid)?.albumName ?? '',
        ytdCount: Number(count),
        coverArt: meta.get(uid)?.coverArt,
      }))
      .filter((track) => track.ytdCount > 0 && !!track.name)
      .sort((a, b) => b.ytdCount - a.ytdCount)
      .slice(0, 200);
  });

  readonly albumTotals = computed<AlbumYtd[]>(() => {
    const totals = this.selectedTotals();
    if (!totals) return [];
    const meta = this.albumMeta();
    return Object.entries(totals.albums ?? {})
      .map(([uri, count]) => ({
        uri,
        name: meta.get(uri)?.name ?? uri,
        image: meta.get(uri)?.image,
        ytdCount: Number(count),
      }))
      .sort((a, b) => b.ytdCount - a.ytdCount);
  });

  readonly trackCount = computed(() => this.topTracks().length);

  ngOnInit(): void {
    const scrollTarget = this.document.defaultView;
    if (scrollTarget) {
      fromEvent(scrollTarget, 'scroll')
        .pipe(
          startWith(null),
          map(() => scrollTarget.scrollY > 280),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((shouldShow) => {
          this.showScrollToTop.set(shouldShow);
        });
    }
    forkJoin({
      tracksLoaded: this.dailyDataApi.loadTracks(),
      ytd: this.historicDataApi.loadYtd(),
    }).subscribe({
      next: ({ ytd }) => {
        const trackMap = new Map<string, YtdTrack>();
        const albumMap = new Map<string, { name: string; image?: string }>();

        this.dailyDataApi.getAll().forEach((track: any) => {
          const album = track.album;
          const coverArt = album?.coverArt?.sources?.[0]?.url;
          if (track.uid) {
            trackMap.set(track.uid, {
              uid: track.uid,
              name: track.name,
              albumName: album?.name ?? '',
              ytdCount: 0,
              coverArt,
            });
          }
          if (album?.uri && !albumMap.has(album.uri)) {
            albumMap.set(album.uri, { name: album.name ?? album.uri, image: coverArt });
          }
        });

        this.trackMeta.set(trackMap);
        this.albumMeta.set(albumMap);
        this.ytdData.set(ytd);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  selectPeriod(value: string): void {
    this.selectedPeriod.set(value);
  }

  scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
