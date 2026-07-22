import { Component, inject, OnInit, signal } from '@angular/core';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { DailyDataApi, HistoricDataApi } from 'ui-shared';

interface ChartItem {
  name: string;
  value: number;
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
export class Overview implements OnInit {
  private dailyDataApi = inject(DailyDataApi);
  private historicDataApi = inject(HistoricDataApi);

  readonly playCounts = signal<Record<string, { playCount: string; change: string; percentChange: string }> | null>(null);
  readonly monthlyChart = signal<ChartItem[]>([]);
  readonly categoryChart = signal<ChartItem[]>([]);
  readonly topTracksChart = signal<ChartItem[]>([]);

  readonly barColorScheme: Color = { name: 'mariah-bar', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#ea4b74', '#f47da0', '#f9b0c6', '#fce0ea', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652', '#be1842', '#a01236', '#fce0ea', '#ea4b74', '#d72652'] };
  readonly pieColorScheme: Color = { name: 'mariah-pie', selectable: true, group: ScaleType.Ordinal, domain: ['#d72652', '#4a90d9', '#f5a623', '#7ed321', '#9b59b6'] };

  ngOnInit(): void {
    const counts = this.dailyDataApi.getPlayCountsByAllType();
    this.playCounts.set(counts);

    if (counts) {
      this.categoryChart.set([
        { name: 'Solo', value: +counts['solo'].playCount },
        { name: 'Featured', value: +counts['featured'].playCount },
        { name: 'Videos', value: +counts['videos'].playCount },
      ]);
    }

    const topTracks = this.dailyDataApi.getAll()
      .sort((a: { change: number }, b: { change: number }) => b.change - a.change)
      .slice(0, 15)
      .map((t: { name: string; change: number }) => ({
        name: t.name.length > 22 ? t.name.slice(0, 22) + '…' : t.name,
        value: +t.change,
      }));
    this.topTracksChart.set(topTracks);

    this.historicDataApi.loadMonthly().subscribe(data => {
      this.monthlyChart.set(
        data.months.map(m => ({ name: MONTH_NAMES[m.month] ?? m.month, value: +m.total }))
      );
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
