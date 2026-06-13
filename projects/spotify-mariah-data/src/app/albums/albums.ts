import { Component, inject } from '@angular/core';
import { AlbumHandler } from '../album-handler';
import { TrackHandler } from '../track-handler';
import { DecimalPipe } from '@angular/common';
import { SELECTED_ALBUMS } from './albums.config';

@Component({
  selector: 'app-albums',
  imports: [DecimalPipe],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  trackHandler = inject(TrackHandler);
  albumHandler = inject(AlbumHandler);

  albumMap = this.filterAlbums(
    this.albumHandler.getAlbumsFromTracks(this.trackHandler.getCurrMap()))

  albums = this.convertToAlbumList(this.albumMap);

  convertToAlbumList(map: Map<string, any[]>): any[] {
    const arr: any[] = [];
    for (let [key, value] of map) {
      const playcount = value.reduce((sum, item) => sum + BigInt(item.playcount), BigInt(0));
      const change = value.reduce((sum, item) => sum + BigInt(item.change), BigInt(0));
      arr.push({
        uri: key,
        name: value[0].album.name,
        playcount: String(playcount),
        change: String(change)
      })
    }
    return arr.sort((a, b) => b.change - a.change);
  }

  filterAlbums(map: Map<string, any[]>): Map<string, any[]> {
    const albumMap = new Map<string, any[]>();
    const selectedSet = new Set(SELECTED_ALBUMS);

    for (let [key, value] of map) {
      if (selectedSet.has(key)) {
        albumMap.set(key, value)
      }
    }

    return albumMap;
  }
}
