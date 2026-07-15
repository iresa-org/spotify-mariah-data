import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { TrackHandler } from 'classic-ui';

type FilterType = 'T' | 'L' | 'S' | 'F' | 'V';

interface FilterTab {
  label: string;
  value: FilterType;
}

const FILTER_TABS: FilterTab[] = [
  { label: 'All', value: 'T' },
  { label: 'Lead', value: 'L' },
  { label: 'Solo', value: 'S' },
  { label: 'Featured', value: 'F' },
  { label: 'Videos', value: 'V' },
];

@Component({
  selector: 'lib-tracks',
  imports: [NgxChartsModule, RouterLink],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks {
  private trackHandler = inject(TrackHandler);

  readonly filterTabs = FILTER_TABS;
  readonly activeFilter = signal<FilterType>('T');

  readonly list = computed(() => {
    const filter = this.activeFilter();
    const getterMap: Record<FilterType, () => unknown[]> = {
      T: this.trackHandler.getAll,
      L: this.trackHandler.getLead,
      S: this.trackHandler.getSolo,
      F: this.trackHandler.getFeatured,
      V: this.trackHandler.getVideos,
    };
    return (getterMap[filter]() as { playcount: number }[]).sort((a, b) => b.playcount - a.playcount);
  });

  readonly chartData = computed(() =>
    (this.list() as unknown as { name: string; change: number }[])
      .sort((a, b) => b.change - a.change)
      .slice(0, 15)
      .map(t => ({
        name: t.name.length > 24 ? t.name.slice(0, 24) + '…' : t.name,
        value: t.change,
      }))
  );

  readonly colorScheme: Color = { name: 'mariah', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652'] };

  getAlbumArt(track: { album?: { coverArt?: { sources?: { url: string }[] } } }): string {
    return track.album?.coverArt?.sources?.[0]?.url ?? '';
  }

  formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  }

  xAxisTickFormat = (val: number) => this.formatCompact(val);
}
