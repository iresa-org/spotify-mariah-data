import { Pipe, PipeTransform } from '@angular/core';
import { formatCompact, formatSignedCompact, NumericLike } from './number.utils';

@Pipe({
  name: 'formatCompact',
})
export class FormatCompactPipe implements PipeTransform {
  transform(value: NumericLike): unknown {
    return formatCompact(value);
  }
}

@Pipe({
  name: 'formatSignedCompact',
})
export class FormatSignedCompactPipe implements PipeTransform {
  transform(value: NumericLike): unknown {
    return formatSignedCompact(value);
  }
}