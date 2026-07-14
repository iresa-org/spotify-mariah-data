import { Component, computed, inject, signal } from '@angular/core';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { TrackHandler } from 'classic-ui';

@Component({
  selector: 'lib-albums',
  imports: [NgxChartsModule],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  private trackHandler = inject(TrackHandler);

  readonly albums = signal(
    (this.trackHandler.getAlbums() as {
      albumDetails: {
        name: string;
        uri: string;
        coverArt: { sources: { url: string; height: number }[] };
        tracks: unknown[];
      };
      dailyChanges: { playCount: string; change: string; percentChange: string };
    }[]).sort((a, b) => +b.dailyChanges.change - +a.dailyChanges.change)
  );

  readonly selectedAlbum = signal<string | null>(null);

  readonly albumTracks = computed(() => {
    const albumUri = this.selectedAlbum();
    if (!albumUri) return [];
    const album = this.albums().find(a => a.albumDetails.uri === albumUri);
    if (!album) return [];
    return (album.albumDetails.tracks as { name: string; playcount: number; change: number; percent: number; artists: { profile: { name: string } }[]; album: { coverArt: { sources: { url: string }[] } } }[])
      .filter(Boolean)
      .sort((a, b) => b.playcount - a.playcount);
  });

  readonly chartData = computed(() =>
    this.albums()
      .slice(0, 15)
      .map(a => ({ name: a.albumDetails.name.length > 18 ? a.albumDetails.name.slice(0, 18) + '…' : a.albumDetails.name, value: +a.dailyChanges.change }))
  );

  readonly colorScheme: Color = { name: 'mariah-albums', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#ea4b74', '#f47da0', '#f9b0c6', '#fce0ea', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652'] };

  getCoverArt(album: { albumDetails: { coverArt?: { sources?: { url: string; height: number }[] } } }): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => s.height >= 300)?.url ?? sources[0].url;
  }

  getLargeCoverArt(album: { albumDetails: { coverArt?: { sources?: { url: string; height: number }[] } } }): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => s.height >= 640)?.url ?? sources[0].url;
  }

  toggleAlbum(uri: string): void {
    this.selectedAlbum.set(this.selectedAlbum() === uri ? null : uri);
  }

  formatCompact(value: number | string): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(+value);
  }

  yAxisTickFormat = (val: number) => this.formatCompact(val);
}
