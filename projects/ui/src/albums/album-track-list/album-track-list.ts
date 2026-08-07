import { Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AlbumRecord, DiscTrackGroup, OrderedAlbumTrack } from '../album.config';
import { AlbumLargeCoverArtPipe } from '../album-pipe';
import {
  GroupedTableComponent,
  GroupedTableCellDirective,
  GroupedTableColumn,
  GroupedTableGroup,
  PercentWithSignPipe,
  toNumber,
} from 'ui-shared';

interface AlbumTrackTableRow {
  uid: string;
  rank: number | '-';
  trackName: string;
  total: number;
  daily: number;
  change: number;
}

@Component({
  selector: 'lib-album-track-list',
  imports: [
    AlbumLargeCoverArtPipe,
    DecimalPipe,
    GroupedTableComponent,
    GroupedTableCellDirective,
    PercentWithSignPipe,
  ],
  templateUrl: './album-track-list.html',
  styleUrl: './album-track-list.scss',
})
export class AlbumTrackList {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly selectedAlbum = input<AlbumRecord | null>(null);

  readonly albumClosed = output<void>();

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  closeAlbum() {
    this.albumClosed.emit();
  }

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

  readonly tableColumns: ReadonlyArray<GroupedTableColumn<AlbumTrackTableRow>> = [
    { id: 'rank', header: '#', width: '44px', value: (row) => row.rank },
    { id: 'trackName', header: 'Track', width: '320px', value: (row) => row.trackName },
    { id: 'total', header: 'Total', width: '112px', align: 'end', value: (row) => row.total },
    { id: 'daily', header: 'Daily', width: '112px', align: 'end', value: (row) => row.daily },
    { id: 'change', header: 'Change', width: '112px', align: 'end', value: (row) => row.change },
  ];

  readonly tableGroups = computed<ReadonlyArray<GroupedTableGroup<AlbumTrackTableRow>>>(() => {
    const album = this.selectedAlbum();
    if (!album) return [];

    const groups = this.albumTrackGroups();
    const groupedRows = groups.map((group) => ({
      id: group.discNumber,
      label: this.hasMultipleDiscs() ? `Disc ${group.discNumber}` : '',
      rows: group.tracks.map((track) => this.toTableRow(track)),
    }));

    const summaryRow: AlbumTrackTableRow = {
      uid: `${album.albumDetails.uri}-summary`,
      rank: '-',
      trackName: 'Total',
      total: toNumber(album.dailyChanges.count),
      daily: toNumber(album.dailyChanges.change),
      change: toNumber(album.dailyChanges.percentChange),
    };

    return [
      ...groupedRows,
      {
        id: 'summary',
        label: '',
        rows: [summaryRow],
      },
    ];
  });

  private toTableRow(track: OrderedAlbumTrack): AlbumTrackTableRow {
    return {
      uid: track.uid,
      rank: track.track,
      trackName: track.name,
      total: toNumber(track.playcount),
      daily: toNumber(track.change),
      change: toNumber(track.percent),
    };
  }
}
