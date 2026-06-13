import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AlbumHandler {

  private albumMap: Map<string, any[]> | null = null;

  getAlbumsFromTracks(currTrackMap: Map<string, any> | null): Map<string, any[]> {
    if (this.albumMap) {
      return this.albumMap;
    }
    
    if (!currTrackMap) {
      return new Map();
    }

    const albumMap = new Map<string, any[]>();
    for (let [_, value] of currTrackMap) {
      albumMap.has(value.album.uri) ?
        albumMap.set(value.album.uri, this.sortTracksOnAlbum([...albumMap.get(value.album.uri)!, value])) :
        albumMap.set(value.album.uri, [value])
    }
    this.albumMap = new Map(albumMap)

    return albumMap
  }

  sortTracksOnAlbum(list: any[]): any[] {
    return list.sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
  }
}
