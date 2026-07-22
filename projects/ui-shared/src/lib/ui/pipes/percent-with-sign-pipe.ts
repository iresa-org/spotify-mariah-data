import { PercentPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentWithSign',
})
export class PercentWithSignPipe extends PercentPipe implements PipeTransform {
  
  override transform(value: number | string, digitsInfo?: string, locale?: string): string | null
  override transform(value: null | undefined, digitsInfo?: string, locale?: string): null
  override transform(value: number | string | null | undefined, digitsInfo?: string, locale?: string): string | null {
    if (value == null || value == undefined) return null;
    
    const num = Number(value);
     if (isNaN(num)) return null;

    const transformed = super.transform(value, digitsInfo, locale);
    return num > 0 ? `+${transformed}` : transformed
  }
}
