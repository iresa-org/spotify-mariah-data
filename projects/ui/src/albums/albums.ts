import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { fromEvent, map, startWith } from 'rxjs';
import { AlbumRanking } from './album-ranking/album-ranking';
import { AlbumRecord } from './album.config';
import { DailyDataApi, formatCompact, toNumber } from 'ui-shared';

@Component({
  selector: 'lib-albums',
  imports: [NgxChartsModule, AlbumRanking],
  templateUrl: './albums.html',
  styleUrl: './albums.scss',
})
export class Albums implements OnInit {
  private readonly document = inject(DOCUMENT);
  private dailyDataApi = inject(DailyDataApi);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly showScrollToTop = signal(false);

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

  dataLabelFormat = (val: number) => (val === 0 ? '' : formatCompact(val));

  ngOnInit(): void {
    const scrollTarget = this.document.defaultView ?? this.document;
    if (scrollTarget) {
      fromEvent(scrollTarget, 'scroll', { capture: true })
        .pipe(
          startWith(null),
          map(() => this.getCurrentScrollTop() > 280),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((shouldShow) => {
          this.showScrollToTop.set(shouldShow);
        });
    }
  }

  private getScrollContainer(): HTMLElement | null {
    const host = this.elementRef.nativeElement;
    let current: HTMLElement | null = host.parentElement;
    while (current) {
      const style = getComputedStyle(current);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  private getCurrentScrollTop(): number {
    const container = this.getScrollContainer();
    const containerScroll = container ? container.scrollTop : 0;
    const windowScroll = this.document.defaultView?.scrollY ?? this.document.documentElement?.scrollTop ?? 0;
    return Math.max(containerScroll, windowScroll);
  }

  scrollToTop(): void {
    const container = this.getScrollContainer();
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
