import { Component, computed, signal } from '@angular/core';
import { DetailContent, MasterContent, MasterDetail } from 'ui-shared';
import { AlbumRecord, DiscTrackGroup, NumericLike, OrderedAlbumTrack } from '../album.config';
import { toNumber } from '../album.utils';
import { AlbumList } from '../album-list/album-list';
import { AlbumTrackList } from '../album-track-list/album-track-list';

@Component({
  selector: 'lib-album-ranking',
  imports: [MasterDetail, MasterContent, DetailContent, AlbumList, AlbumTrackList],
  templateUrl: './album-ranking.html',
  styleUrl: './album-ranking.scss',
})
export class AlbumRanking {

  readonly selectedAlbum = signal<AlbumRecord | null>(null);

  onAlbumSelected($event: AlbumRecord | null) {
    this.selectedAlbum.set($event);
  }

  closeAlbum(): void {
    this.selectedAlbum.set(null);
  }

  closeClicked(): void {
    this.selectedAlbum.set(null);
  }

}
