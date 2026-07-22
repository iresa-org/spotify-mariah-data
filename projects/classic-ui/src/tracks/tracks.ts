import { Component, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { DailyDataApi, NumberWithSignPipe, PercentWithSignPipe } from 'ui-shared';

@Component({
  selector: 'app-tracks',
  imports: [DecimalPipe, PercentWithSignPipe, NumberWithSignPipe],
  templateUrl: './tracks.html',
  styleUrl: './tracks.scss',
})
export class Tracks {

  dailyDataApi = inject(DailyDataApi);

  list = signal<any[]>(this.transformList(this.dailyDataApi.getAll()));

  counts = this.dailyDataApi.getPlayCountsByAllType();

  changeList(type: 'T' | 'L' | 'S' | 'F' | 'V'): void {
    const map = {
      'T': this.dailyDataApi.getAll,
      'L': this.dailyDataApi.getLead,
      'S': this.dailyDataApi.getSolo,
      'F': this.dailyDataApi.getFeatured,
      'V': this.dailyDataApi.getVideos
    }
    this.list.set(this.transformList(map[type]()))
  }

  transformList(list: any[]): any[] {
    return list
      .sort((a, b) => b.change - a.change)
  }
}
