import { Pipe, PipeTransform } from '@angular/core';
import { TRACK_CATEGORIES } from './tracks.config';

@Pipe({
  name: 'getTrackCategory',
})
export class GetTrackCategoryPipe implements PipeTransform {
  transform(value: string): string {
    return TRACK_CATEGORIES.find(cat => cat.value === value)?.label ?? '';
  }
}
