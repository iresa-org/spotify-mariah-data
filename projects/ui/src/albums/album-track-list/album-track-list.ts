import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AlbumRecord, DiscTrackGroup, OrderedAlbumTrack } from '../album.config';
import { AlbumLargeCoverArtPipe } from '../album-pipe';
import { toNumber } from '../album.utils';
import { PercentWithSignPipe } from 'ui-shared';

@Component({
  selector: 'lib-album-track-list',
  imports: [AlbumLargeCoverArtPipe, DecimalPipe, PercentWithSignPipe],
  templateUrl: './album-track-list.html',
  styleUrl: './album-track-list.scss',
})
export class AlbumTrackList {

  readonly selectedAlbum = input<AlbumRecord | null>(null);

  readonly albumClosed = output<void>();

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
}
