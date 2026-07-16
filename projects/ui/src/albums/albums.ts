import { Component, computed, inject, signal } from '@angular/core';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { TrackHandler } from 'classic-ui';

type NumericLike = number | string;

interface CoverSource {
  url: string;
  height?: number;
}

interface AlbumTrack {
  uid: string;
  name: string;
  playcount: NumericLike;
  change: NumericLike;
  percent: NumericLike;
  discNumber?: NumericLike;
  trackNumber?: NumericLike;
  artists?: { uri: string; profile?: { name?: string } }[];
  album?: { coverArt?: { sources?: CoverSource[] } };
}

interface AlbumRecord {
  albumDetails: {
    name: string;
    uri: string;
    coverArt?: { sources?: CoverSource[] };
    tracks: AlbumTrack[];
  };
  dailyChanges: {
    playCount: NumericLike;
    change: NumericLike;
    percentChange: NumericLike;
  };
}

interface OrderedAlbumTrack extends AlbumTrack {
  originalOrder: number;
  disc: number;
  track: number;
}

interface DiscTrackGroup {
  discNumber: number;
  tracks: OrderedAlbumTrack[];
}

@Component({
  selector: 'lib-albums',
  imports: [NgxChartsModule],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  private trackHandler = inject(TrackHandler);

  readonly albums = signal(
    (this.trackHandler.getAlbums() as AlbumRecord[]).sort(
      (a, b) => this.toNumber(b.dailyChanges.change) - this.toNumber(a.dailyChanges.change)
    )
  );

  readonly selectedAlbumUri = signal<string | null>(null);

  readonly selectedAlbum = computed(() => {
    const albumUri = this.selectedAlbumUri();
    if (!albumUri) return null;
    return this.albums().find(album => album.albumDetails.uri === albumUri) ?? null;
  });

  readonly albumTrackGroups = computed<DiscTrackGroup[]>(() => {
    const album = this.selectedAlbum();
    if (!album) return [];

    const orderedTracks = album.albumDetails.tracks
      .filter(track => !!track)
      .map((track, index) => {
        const normalizedDisc = this.toTrackDisc(track.discNumber);
        const normalizedTrack = this.toTrackNumber(track.trackNumber, index + 1);

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

  readonly chartData = computed(() =>
    this.albums()
      .slice(0, 15)
      .map(a => ({
        name: a.albumDetails.name.length > 18 ? a.albumDetails.name.slice(0, 18) + '…' : a.albumDetails.name,
        value: this.toNumber(a.dailyChanges.change),
      }))
  );

  readonly colorScheme: Color = { name: 'mariah-albums', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#ea4b74', '#f47da0', '#f9b0c6', '#fce0ea', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652'] };

  getCoverArt(album: AlbumRecord): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => (s.height ?? 0) >= 300)?.url ?? sources[0].url;
  }

  getLargeCoverArt(album: AlbumRecord): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => (s.height ?? 0) >= 640)?.url ?? sources[0].url;
  }

  toggleAlbum(uri: string): void {
    this.selectedAlbumUri.set(this.selectedAlbumUri() === uri ? null : uri);
  }

  closeAlbum(): void {
    this.selectedAlbumUri.set(null);
  }

  formatCompact(value: NumericLike): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(this.toNumber(value));
  }

  formatSignedCompact(value: NumericLike): string {
    const numericValue = this.toNumber(value);
    const compact = this.formatCompact(Math.abs(numericValue));
    if (numericValue < 0) return `-${compact}`;
    if (numericValue > 0) return `+${compact}`;
    return compact;
  }

  formatPercentFromRatio(value: NumericLike): string {
    const percentage = this.toNumber(value) * 100;
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  private toNumber(value: NumericLike): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private toTrackDisc(value?: NumericLike): number {
    const disc = this.toNumber(value ?? 1);
    return disc >= 1 ? disc : 1;
  }

  private toTrackNumber(value: NumericLike | undefined, fallback: number): number {
    const track = this.toNumber(value ?? fallback);
    return track >= 1 ? track : fallback;
  }

  yAxisTickFormat = (val: number) => this.formatCompact(val);
}
