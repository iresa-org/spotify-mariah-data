import { Component, inject } from '@angular/core';
import { TrackHandler } from '../track-handler';
import { DecimalPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-albums',
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  trackHandler = inject(TrackHandler);

  albums = this.formatAlbumList(this.trackHandler.getAlbums());

  formatAlbumList(list: any[]): any[] {
    return list.map(album => ({
      uri: album.albumDetails.uri,
      name: album.albumDetails.name,
      playcount: album.dailyChanges.playCount,
      change: album.dailyChanges.change,
      percent: album.dailyChanges.percentChange
    })).sort((a, b) => b.change - a.change);
  }
}
