import { Component, computed, effect, inject, OnInit, output, signal } from '@angular/core';
import { AlbumRecord } from '../album.config';
import { DailyDataApi, FormatCompactPipe, FormatSignedCompactPipe, HistoricDataApi, PercentWithSignPipe, toNumber } from 'ui-shared';
import { NgOptimizedImage } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBirthdayCake } from '@fortawesome/free-solid-svg-icons';

type RecordEntry = Record<string, { change: string; date: string }>;

@Component({
  selector: 'lib-album-list',
  imports: [FormatCompactPipe, FormatSignedCompactPipe, PercentWithSignPipe, NgOptimizedImage, FontAwesomeModule],
  templateUrl: './album-list.html',
  styleUrl: './album-list.scss',
})
export class AlbumList implements OnInit {
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);

  protected readonly albumSelected = output<AlbumRecord | null>();

  readonly anniversaryIcon = faBirthdayCake;
  readonly allTimeRecordMap = signal<RecordEntry | null>(null);
  readonly yearRecordMap = signal<RecordEntry | null>(null);
  readonly recordMapLoaded = computed(() => this.allTimeRecordMap() !== null && this.yearRecordMap() !== null);

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

  ngOnInit(): void {
    this.historicDataApi.loadAllTimeRecords().subscribe({
      next: ({ albums }) => this.allTimeRecordMap.set(albums),
      error: () => {},
    });

    this.historicDataApi.loadYtdRecords().subscribe({
      next: ({ albums }) => this.yearRecordMap.set(albums),
      error: () => {},
    });
  }

  hasRecord(albumUri: string, type: 'allTime' | 'ytd' = 'allTime'): boolean {
    const recordMap = type === 'allTime' ? this.allTimeRecordMap() : this.yearRecordMap();
    if (!recordMap) return false;
    const rec = recordMap[albumUri];
    if (!rec || !rec.date) return false;

    const lastUpdated = this.dailyDataApi.getLastUpdated();
    const lastUpdatedDay = lastUpdated?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';

    return rec.date === lastUpdatedDay;
  }

  isAnniversary(album: AlbumRecord): boolean {
    const isoDate = album.albumDetails?.date?.isoString;
    if (!isoDate) return false;

    const released = new Date(isoDate);
    if (Number.isNaN(released.getTime())) return false;

    const today = new Date();
    return released.getUTCMonth() === today.getMonth() && released.getUTCDate() === today.getDate();
  }

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
