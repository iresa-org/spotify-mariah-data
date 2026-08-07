import { afterNextRender, Component, ElementRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { DailyDataApi, HistoricDataApi } from 'ui-shared';

interface ChartItem {
  name: string;
  value: number;
}

interface ChartSeries {
  name: string;
  series: ChartItem[];
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

@Component({
  selector: 'lib-overview',
  imports: [NgxChartsModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview implements OnInit, OnDestroy {
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);
  private elementRef = inject(ElementRef);

  readonly headerImage = signal<string | null>(null);
  readonly playCounts = signal<Record<string, { count: string; change: string; percentChange: string }> | null>(null);
  readonly monthlyChart = signal<ChartItem[]>([]);
  readonly categoryChart = signal<ChartItem[]>([]);
  readonly topTracks = signal<{ name: string; playcount: number }[]>([]);
  readonly listenersChart = signal<ChartSeries[]>([]);
  readonly artistStats = signal<{ followers: number; monthlyListeners: number } | null>(null);
  readonly topCities = signal<{ city: string; country: string; region: string; numberOfListeners: number }[]>([]);

  readonly barColorScheme: Color = { name: 'mariah-bar', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#ea4b74', '#f47da0', '#f9b0c6', '#fce0ea', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652'] };

  readonly barChartView = signal<[number, number]>([600, 280]);
  readonly lineChartView = signal<[number, number]>([600, 300]);

  private resizeObserver!: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      const container: HTMLElement | null = this.elementRef.nativeElement.querySelector('.charts-grid');
      if (!container) return;
      this.resizeObserver = new ResizeObserver(([entry]) => {
        const w = entry.contentRect.width;
        this.barChartView.set([w, 280]);
        this.lineChartView.set([w, 300]);
      });
      this.resizeObserver.observe(container);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  ngOnInit(): void {
    this.headerImage.set(this.dailyDataApi.getHeaderImage());

    const counts = this.dailyDataApi.getPlayCountsByAllType();
    this.playCounts.set(counts);

    if (counts) {
      this.categoryChart.set([
        { name: 'Solo', value: +counts['solo'].count },
        { name: 'Featured', value: +counts['featured'].count },
        { name: 'Videos', value: +counts['videos'].count },
      ]);
    }

    this.topTracks.set(this.dailyDataApi.getTopTracks());
    this.artistStats.set(this.dailyDataApi.getArtistStats());
    this.topCities.set(this.dailyDataApi.getTopCities());

    this.historicDataApi.loadMonthly().subscribe(data => {
      this.monthlyChart.set(
        data.months.map(m => ({ name: MONTH_NAMES[m.month] ?? m.month, value: +m.total }))
      );
    });

    this.historicDataApi.loadMonthlyListeners().subscribe(data => {
      const series = Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => {
          const [, month, day] = date.split('-');
          return { name: `${MONTH_NAMES[month] ?? month} ${day}`, value: +count };
        });
      this.listenersChart.set([{ name: 'Monthly Listeners', series }]);
    });
  }

  formatCompact(value: number | string): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(+value);
  }

  formatPercent(value: string): string {
    return (+value * 100).toFixed(2) + '%';
  }

  yAxisTickFormat = (val: number) => this.formatCompact(val);
}
