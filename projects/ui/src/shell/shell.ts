import { Component, computed, signal } from '@angular/core';
import { Kpi, MonthlyStreams, TopTrack } from './shell.config';

@Component({
  selector: 'lib-shell',
  imports: [],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly kpis = signal<readonly Kpi[]>([
    { label: 'Daily Streams', value: 7_480_000, delta: 3.2 },
    { label: 'Monthly Listeners', value: 29_300_000, delta: 2.1 },
    { label: 'Playlist Adds', value: 81_900, delta: 5.9 },
    { label: 'Saves', value: 142_200, delta: -1.4 },
  ]);

  readonly monthlyStreams = signal<readonly MonthlyStreams[]>([
    { month: 'Jan', streamsInMillions: 178 },
    { month: 'Feb', streamsInMillions: 165 },
    { month: 'Mar', streamsInMillions: 172 },
    { month: 'Apr', streamsInMillions: 168 },
    { month: 'May', streamsInMillions: 183 },
    { month: 'Jun', streamsInMillions: 189 },
  ]);

  readonly topTracks = signal<readonly TopTrack[]>([
    {
      title: 'All I Want for Christmas Is You',
      album: 'Merry Christmas',
      streams: 1_924_000_000,
      growth: 9.4,
    },
    {
      title: 'We Belong Together',
      album: 'The Emancipation of Mimi',
      streams: 522_000_000,
      growth: 2.8,
    },
    {
      title: 'Obsessed',
      album: 'Memoirs of an Imperfect Angel',
      streams: 298_000_000,
      growth: 1.2,
    },
    {
      title: 'Fantasy',
      album: 'Daydream',
      streams: 246_000_000,
      growth: 0.8,
    },
  ]);

  readonly peakStreamMonth = computed(() =>
    this.monthlyStreams().reduce((peak, month) =>
      month.streamsInMillions > peak.streamsInMillions ? month : peak,
    ),
  );

  formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
}
