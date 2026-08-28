import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormatCompactPipe } from 'ui-shared';
import { YtdTrack } from '../ytd.types';

@Component({
  selector: 'lib-ytd-top-tracks',
  imports: [FormatCompactPipe, NgOptimizedImage],
  templateUrl: './top-tracks.html',
  styleUrl: './top-tracks.scss',
})
export class YtdTopTracks {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly tracks = input.required<YtdTrack[]>();
  readonly isYtdPeriod = input.required<boolean>();
  readonly periodLabel = input.required<string>();
  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe('(max-width: 720px)')
      .pipe(map(({ matches }) => matches)),
    { initialValue: false }
  );

  readonly title = computed(() =>
    this.isYtdPeriod() ? 'Top 200 Tracks of the Year' : `Top 200 Tracks in ${this.periodLabel()}`
  );

  readonly metricLabel = computed(() => (this.isYtdPeriod() ? 'YTD Streams' : 'Streams'));
}
