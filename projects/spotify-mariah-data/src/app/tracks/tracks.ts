import { Component, inject, signal } from '@angular/core';
import { TrackHandler } from '../track-handler';
import { DecimalPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-tracks',
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks {

  trackHandler = inject(TrackHandler);

  list = signal<any[]>(this.transformList(this.trackHandler.getAll()));

  counts = this.trackHandler.getPlayCountsByAllType();

  changeList(type: 'T' | 'L' | 'S' | 'F' | 'V'): void {
    const map = {
      'T': this.trackHandler.getAll,
      'L': this.trackHandler.getLead,
      'S': this.trackHandler.getSolo,
      'F': this.trackHandler.getFeatured,
      'V': this.trackHandler.getVideos
    }
    this.list.set(this.transformList(map[type]()))
  }

  transformList(list: any[]): any[] {
    return list.map(item => ({
      ...item,
      change: String(BigInt(item.playcount) - BigInt(item.prevcount ?? 0)),
      // changePercentage: item.prevcount > 0 ? (item.playcount - item.prevcount) * 100 / item.prevcount : 0
    }))
      .sort((a, b) => b.change - a.change)
  }
}
