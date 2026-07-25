import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { map } from 'rxjs';
import { AlbumRanking } from './album-ranking/album-ranking';
import { AlbumRecord } from './album.config';
import { formatCompact, toNumber } from './album.utils';
import { DailyDataApi } from 'ui-shared';

@Component({
  selector: 'lib-albums',
  imports: [NgxChartsModule, AlbumRanking],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums {
  private dailyDataApi = inject(DailyDataApi);

  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly albums = signal(
    (this.dailyDataApi.getAlbums() as AlbumRecord[]).sort(
      (a, b) => toNumber(b.dailyChanges.change) - toNumber(a.dailyChanges.change)
    )
  );

  readonly chartData = computed(() =>
    this.albums()
      .slice(0, 15)
      .map(a => ({
        name: a.albumDetails.name.length > 18 ? a.albumDetails.name.slice(0, 18) + '…' : a.albumDetails.name,
        value: toNumber(a.dailyChanges.change),
      }))
  );

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  readonly colorScheme: Color = { name: 'mariah-albums', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#ea4b74', '#f47da0', '#f9b0c6', '#fce0ea', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652'] };

  readonly verticalBarPadding = computed(() => {
    const barCount = this.chartData().length;
    if (barCount >= 14) return 24;
    if (barCount >= 10) return 18;
    if (barCount >= 7) return 12;
    return 8;
  });

  axisTickFormat = (val: number) => formatCompact(val);
}
