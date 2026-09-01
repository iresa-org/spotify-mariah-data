import { DecimalPipe, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, ElementRef, inject, OnInit, AfterViewInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBirthdayCake, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { fromEvent, map, startWith } from 'rxjs';
import { DailyDataApi, FormatCompactPipe, HistoricDataApi, PercentWithSignPipe } from 'ui-shared';
import { TRACK_CATEGORIES, FilterType, TrackItem } from './tracks.config';

type RecordEntry = {
  change: string;
  date: string;
};

type TrackSortKey = 'name' | 'playcount' | 'change' | 'percent';
type SortDirection = 'ascending' | 'descending';

@Component({
  selector: 'lib-tracks',
  imports: [RouterLink, PercentWithSignPipe, FormatCompactPipe, DecimalPipe, NgOptimizedImage, FontAwesomeModule],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks implements OnInit, AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);
  private breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);

  private readonly SCROLL_POSITION_KEY = 'tracks-scroll-position';

  readonly filterTabs = TRACK_CATEGORIES;
  readonly activeFilter = signal<FilterType>('T');
  readonly searchQuery = signal('');
  readonly sortKey = signal<TrackSortKey>('change');
  readonly sortDirection = signal<SortDirection>('descending');
  readonly sortAscendingIcon = faSortUp;
  readonly sortDescendingIcon = faSortDown;
  readonly anniversaryIcon = faBirthdayCake;
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
    const filtered = !query ? getterMap[filter]() : getterMap[filter]().filter(track =>
      track.name?.toLowerCase().includes(query) ||
      track.album?.name?.toLowerCase().includes(query)
    );
    const sortKey = this.sortKey();
    const direction = this.sortDirection() === 'ascending' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        return direction * (a.name ?? '').localeCompare(b.name ?? '');
      }

      return direction * (Number(a[sortKey]) - Number(b[sortKey]));
    });
  });

  ngOnInit(): void {
    const scrollTarget = this.document.defaultView ?? this.document;
    if (scrollTarget) {
      fromEvent(scrollTarget, 'scroll', { capture: true })
        .pipe(
          startWith(null),
          map(() => this.getCurrentScrollTop() > 280),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((shouldShow) => {
          this.showScrollToTop.set(shouldShow);
        });

      fromEvent(scrollTarget, 'scroll', { capture: true })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.saveScrollPosition();
        });
    }

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

  ngAfterViewInit(): void {
    // Wait for the list to be rendered in the DOM before restoring scroll position
    // Use requestAnimationFrame twice to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.restoreScrollPosition();
      });
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

  sortBy(column: TrackSortKey): void {
    if (this.sortKey() === column) {
      this.sortDirection.update(direction => direction === 'ascending' ? 'descending' : 'ascending');
      return;
    }

    this.sortKey.set(column);
    this.sortDirection.set(column === 'name' ? 'ascending' : 'descending');
  }

  getAriaSort(column: TrackSortKey): 'none' | SortDirection {
    return this.sortKey() === column ? this.sortDirection() : 'none';
  }

  isSortedColumn(column: TrackSortKey): boolean {
    return this.sortKey() === column;
  }

  getSortIcon(column: TrackSortKey): IconDefinition {
    return this.sortDirection() === 'ascending' ? this.sortAscendingIcon : this.sortDescendingIcon;
  }

  getAlbumArt(track: TrackItem): string {
    return track.album?.coverArt?.sources?.[0]?.url ?? '';
  }

  isAnniversary(track: TrackItem): boolean {
    const isoDate = track.firstPublishedAt;
    if (!isoDate) return false;

    const published = new Date(isoDate);
    if (Number.isNaN(published.getTime())) return false;

    const today = new Date();
    return published.getMonth() === today.getMonth() && published.getDate() === today.getDate();
  }

  private getScrollContainer(): HTMLElement | null {
    const host = this.elementRef.nativeElement;
    let current: HTMLElement | null = host.parentElement;
    while (current) {
      const style = getComputedStyle(current);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  private getCurrentScrollTop(): number {
    const container = this.getScrollContainer();
    const containerScroll = container ? container.scrollTop : 0;
    const windowScroll = this.document.defaultView?.scrollY ?? this.document.documentElement?.scrollTop ?? 0;
    return Math.max(containerScroll, windowScroll);
  }

  scrollToTop(): void {
    const container = this.getScrollContainer();
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private saveScrollPosition(): void {
    const scrollTop = this.getCurrentScrollTop();
    sessionStorage.setItem(this.SCROLL_POSITION_KEY, scrollTop.toString());
  }

  private restoreScrollPosition(): void {
    const savedPosition = sessionStorage.getItem(this.SCROLL_POSITION_KEY);
    if (savedPosition) {
      const scrollTop = parseInt(savedPosition, 10);
      const container = this.getScrollContainer();
      
      if (container) {
        container.scrollTop = scrollTop;
      } else {
        const window = this.document.defaultView;
        if (window) {
          window.scrollTo(0, scrollTop);
        }
      }
      
      // Clear the saved position after restoring
      sessionStorage.removeItem(this.SCROLL_POSITION_KEY);
    }
  }
}
