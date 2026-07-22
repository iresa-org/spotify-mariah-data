import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { AlbumFormatCompactPipe, AlbumFormatSignedCompactPipe } from '../album-pipe';
import { AlbumRecord } from '../album.config';
import { toNumber } from '../album.utils';
import { DailyDataApi, PercentWithSignPipe } from 'ui-shared';

@Component({
  selector: 'lib-album-list',
  imports: [AlbumFormatCompactPipe, AlbumFormatSignedCompactPipe, PercentWithSignPipe],
  templateUrl: './album-list.html',
  styleUrl: './album-list.scss',
})
export class AlbumList {
  private dailyDataApi = inject(DailyDataApi);

  protected readonly albumSelected = output<AlbumRecord | null>();

  readonly albums = signal(
    (this.dailyDataApi.getAlbums() as AlbumRecord[]).sort(
      (a, b) => toNumber(b.dailyChanges.change) - toNumber(a.dailyChanges.change)
    )
  );

  readonly selectedAlbumUri = signal<string | null>(null);

  readonly selectedAlbum = computed(() => {
    const albumUri = this.selectedAlbumUri();
    if (!albumUri) return null;
    return this.albums().find(album => album.albumDetails.uri === albumUri) ?? null;
  });

  readonly onAlbumSelected = effect(() => {
    this.albumSelected.emit(this.selectedAlbum());
  });


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
}
