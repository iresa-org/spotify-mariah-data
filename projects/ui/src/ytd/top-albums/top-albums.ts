import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { FormatCompactPipe } from 'ui-shared';
import { AlbumYtd } from '../ytd.types';

@Component({
  selector: 'lib-ytd-top-albums',
  imports: [FormatCompactPipe, NgOptimizedImage],
  templateUrl: './top-albums.html',
  styleUrl: './top-albums.scss',
})
export class YtdTopAlbums {
  readonly albums = input.required<AlbumYtd[]>();
  readonly isYtdPeriod = input.required<boolean>();
  readonly periodLabel = input.required<string>();

  readonly title = computed(() =>
    this.isYtdPeriod() ? 'Year-to-date Streams by Album' : `${this.periodLabel()} Streams by Album`
  );

  readonly metricLabel = computed(() => (this.isYtdPeriod() ? 'YTD Streams' : 'Streams'));
}
