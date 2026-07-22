import { DecimalPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberWithSign',
})
export class NumberWithSignPipe extends DecimalPipe implements PipeTransform {

  override transform(value: number | string, digitsInfo?: string, locale?: string): string | null
  override transform(value: null | undefined, digitsInfo?: string, locale?: string): null
  override transform(value: number | string | null | undefined, digitsInfo?: string, locale?: string): string | null {
    const transformed = super.transform(value, digitsInfo, locale);
    if (transformed == null) return null;

    const num = Number(value);
    return num > 0 ? `+${transformed}` : transformed
  }
}
