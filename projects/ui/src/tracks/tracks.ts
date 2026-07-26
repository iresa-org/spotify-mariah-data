import { BreakpointObserver } from '@angular/cdk/layout';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DailyDataApi } from 'ui-shared';
import { TRACK_CATEGORIES, FilterType, TrackItem } from './tracks.config';

@Component({
  selector: 'lib-tracks',
  imports: [RouterLink, ScrollingModule],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks {
  private dailyDataApi = inject(DailyDataApi);
  private breakpointObserver = inject(BreakpointObserver);

  readonly filterTabs = TRACK_CATEGORIES;
  readonly activeFilter = signal<FilterType>('T');
  readonly searchQuery = signal('');
  readonly desktopRowHeight = 64;

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
    const sorted = [...getterMap[filter]()].sort((a, b) => b.playcount - a.playcount);
    if (!query) return sorted;
    return sorted.filter(track =>
      track.name?.toLowerCase().includes(query) ||
      track.album?.name?.toLowerCase().includes(query)
    );
  });

  trackByUid(_index: number, track: TrackItem): string {
    return track.uid;
  }

  getAlbumArt(track: TrackItem): string {
    return track.album?.coverArt?.sources?.[0]?.url ?? '';
  }

  formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  }
}
