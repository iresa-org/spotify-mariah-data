import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TrackHandler } from '../../../../classic-ui/src/track-handler';
import { AlbumRecord, DiscTrackGroup, NumericLike, OrderedAlbumTrack } from '../album.config';
import { toNumber } from '../album.utils';
import { AlbumFormatCompactPipe, AlbumFormatSignedCompactPipe } from '../album-pipe';

@Component({
  selector: 'lib-album-ranking',
  imports: [DecimalPipe, AlbumFormatCompactPipe, AlbumFormatSignedCompactPipe],
  templateUrl: './album-ranking.html',
  styleUrl: './album-ranking.scss',
})
export class AlbumRanking {

  private trackHandler = inject(TrackHandler);

  readonly albums = signal(
    (this.trackHandler.getAlbums() as AlbumRecord[]).sort(
      (a, b) => toNumber(b.dailyChanges.change) - toNumber(a.dailyChanges.change)
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

  formatPercentFromRatio(value: NumericLike): string {
    const percentage = toNumber(value) * 100;
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  private toTrackDisc(value?: NumericLike): number {
    const disc = toNumber(value ?? 1);
    return disc >= 1 ? disc : 1;
  }

  private toTrackNumber(value: NumericLike | undefined, fallback: number): number {
    const track = toNumber(value ?? fallback);
    return track >= 1 ? track : fallback;
  }

}
