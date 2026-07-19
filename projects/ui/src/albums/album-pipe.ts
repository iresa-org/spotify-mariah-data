import { Pipe, PipeTransform } from '@angular/core';
import { formatCompact, formatSignedCompact } from './album.utils';
import { NumericLike } from './album.config';

@Pipe({
  name: 'albumFormatCompact',
})
export class AlbumFormatCompactPipe implements PipeTransform {
  transform(value: NumericLike): unknown {
    return formatCompact(value);
  }
}

@Pipe({
  name: 'albumFormatSignedCompact',
})
export class AlbumFormatSignedCompactPipe implements PipeTransform {
  transform(value: NumericLike): unknown {
    return formatSignedCompact(value);
  }
}