import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DailyDataApi, PercentWithSignPipe } from 'ui-shared';

@Component({
  selector: 'app-albums',
  imports: [DecimalPipe, PercentWithSignPipe],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  dailyDataApi = inject(DailyDataApi);

  albums = this.formatAlbumList(this.dailyDataApi.getAlbums());

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
