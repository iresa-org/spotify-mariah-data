import { Component, input, output } from '@angular/core';
import { PeriodOption } from './ytd.types';

@Component({
  selector: 'lib-ytd-header',
  imports: [],
  templateUrl: './ytd-header.html',
  styleUrl: './ytd-header.scss',
})
export class YtdHeader {
  readonly title = input.required<string>();
  readonly periodId = input.required<string>();
  readonly selectedPeriod = input.required<string>();
  readonly periodOptions = input.required<PeriodOption[]>();
  readonly periodChange = output<string>();

  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.periodChange.emit(select.value);
  }
}
