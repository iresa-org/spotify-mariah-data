import { DecimalPipe, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { fromEvent, map, startWith } from 'rxjs';
import { DailyDataApi, FormatCompactPipe, HistoricDataApi, PercentWithSignPipe } from 'ui-shared';
import { TRACK_CATEGORIES, FilterType, TrackItem } from './tracks.config';

type RecordEntry = {
  change: string;
  date: string;
};

@Component({
  selector: 'lib-tracks',
  imports: [RouterLink, ScrollingModule, PercentWithSignPipe, FormatCompactPipe, DecimalPipe, NgOptimizedImage],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks implements OnInit {
  private readonly document = inject(DOCUMENT);
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);
  private breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly filterTabs = TRACK_CATEGORIES;
  readonly activeFilter = signal<FilterType>('T');
  readonly searchQuery = signal('');
  readonly desktopRowHeight = 64;
  readonly showScrollToTop = signal(false);
  readonly allTimeRecordMap = signal<Record<string, RecordEntry> | null>(null);
  readonly yearRecordMap = signal<Record<string, RecordEntry> | null>(null);
  readonly recordMapLoaded = computed(() => this.allTimeRecordMap() !== null && this.yearRecordMap() !== null);

  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe('(max-width: 720px)')
      .pipe(map(({ matches }) => matches)),
    { initialValue: false }
  );

  readonly list = computed<TrackItem[]>(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    const getterMap: Record<FilterType, () => TrackItem[]> = {
      T: this.dailyDataApi.getAll,
      L: this.dailyDataApi.getLead,
      S: this.dailyDataApi.getSolo,
      F: this.dailyDataApi.getFeatured,
      V: this.dailyDataApi.getVideos,
    };
    const sorted = [...getterMap[filter]()].sort((a, b) => b.change - a.change);
    if (!query) return sorted;
    return sorted.filter(track =>
      track.name?.toLowerCase().includes(query) ||
      track.album?.name?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    const scrollTarget = this.document.defaultView;
    if (!scrollTarget) return;

    fromEvent(scrollTarget, 'scroll')
      .pipe(
        startWith(null),
        map(() => scrollTarget.scrollY > 280),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((shouldShow) => {
        this.showScrollToTop.set(shouldShow);
      });

    this.historicDataApi
      .loadAllTimeRecords()
      .subscribe({
        next: ({ tracks }) => {
          this.allTimeRecordMap.set(tracks);
        },
        error: () => {
          // Ignore fetch errors silently
        },
      });

    this.historicDataApi
      .loadYtdRecords()
      .subscribe({
        next: ({ tracks }) => {
          this.yearRecordMap.set(tracks);
        },
        error: () => {
          // Ignore fetch errors silently
        },
      });
  }

  hasRecord(uid: string, type: 'allTime' | 'ytd' = 'allTime'): boolean {
    const recordMap = type === 'allTime' ? this.allTimeRecordMap() : this.yearRecordMap();
    if (!recordMap) return false;
    const rec = recordMap[uid];
    if (!rec || !rec.date) return false;

    const lastUpdated = this.dailyDataApi.getLastUpdated();
    const lastUpdatedDay = lastUpdated?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';

    return rec.date === lastUpdatedDay;
  }

  trackByUid(_index: number, track: TrackItem): string {
    return track.uid;
  }

  getAlbumArt(track: TrackItem): string {
    return track.album?.coverArt?.sources?.[0]?.url ?? '';
  }

  scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
