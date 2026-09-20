import { DecimalPipe, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, effect, ElementRef, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBirthdayCake, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { map } from 'rxjs';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  DailyDataApi,
  DetailContent,
  FormatCompactPipe,
  HistoricDataApi,
  MasterContent,
  MasterDetail,
  PercentWithSignPipe,
} from 'ui-shared';
import { TRACK_CATEGORIES, FilterType, TrackItem } from './tracks.config';
import { TrackDetail } from './track-detail/track-detail';
import { TrackDetailDialog } from './track-detail/track-detail-dialog';

type RecordEntry = {
  change: string;
  date: string;
};

type TrackSortKey = 'name' | 'playcount' | 'change' | 'percent';
type SortDirection = 'ascending' | 'descending';

@Component({
  selector: 'lib-tracks',
  imports: [
    MasterDetail,
    MasterContent,
    DetailContent,
    TrackDetail,
    PercentWithSignPipe,
    FormatCompactPipe,
    DecimalPipe,
    NgOptimizedImage,
    FontAwesomeModule,
  ],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks implements OnInit {
  private readonly document = inject(DOCUMENT);
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);
  private breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly dialog = inject(Dialog);

  private dialogRef: DialogRef<unknown, TrackDetailDialog> | null = null;

  readonly filterTabs = TRACK_CATEGORIES;
  readonly activeFilter = signal<FilterType>('T');
  readonly searchQuery = signal('');
  readonly sortKey = signal<TrackSortKey>('change');
  readonly sortDirection = signal<SortDirection>('descending');
  readonly sortAscendingIcon = faSortUp;
  readonly sortDescendingIcon = faSortDown;
  readonly anniversaryIcon = faBirthdayCake;
  readonly showScrollToTop = signal(false);
  readonly selectedTrack = signal<TrackItem | null>(null);
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

  constructor() {
    effect(() => {
      if (!this.isMobile()) {
        this.closeDialog();
      }
    });
  }

  ngOnInit(): void {
    this.document.defaultView?.addEventListener('scroll', this.updateScrollTopVisibility, { capture: true });
    this.destroyRef.onDestroy(() => {
      this.document.defaultView?.removeEventListener('scroll', this.updateScrollTopVisibility, { capture: true });
    });
    this.updateScrollTopVisibility();

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

  onTrackSelected(track: TrackItem): void {
    this.closeDialog();
    this.selectedTrack.set(track);
    if (this.isMobile()) {
      this.dialogRef = this.dialog.open(TrackDetailDialog, {
        ariaLabel: track.name ? `${track.name} details` : 'Track details',
        data: { uid: track.uid },
        maxWidth: '96vw',
        width: 'min(960px, 96vw)',
      });
      this.dialogRef.closed.subscribe(() => {
        this.dialogRef = null;
        this.selectedTrack.set(null);
      });
    }
  }

  closeClicked(): void {
    this.closeDialog();
    this.selectedTrack.set(null);
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

  private closeDialog(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
  }

  private updateScrollTopVisibility = (): void => {
    this.showScrollToTop.set(this.getCurrentScrollTop() > 280);
  }
}
