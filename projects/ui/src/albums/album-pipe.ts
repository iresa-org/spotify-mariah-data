import { Pipe, PipeTransform } from '@angular/core';
import { formatCompact, formatSignedCompact } from './album.utils';
import { AlbumRecord, NumericLike } from './album.config';

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

@Pipe({
  name: 'albumCoverArt',
})
export class AlbumCoverArtPipe implements PipeTransform {
  transform(album: AlbumRecord): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => (s.height ?? 0) >= 300)?.url ?? sources[0].url;
  }
}

@Pipe({
  name: 'albumLargeCoverArt',
})
export class AlbumLargeCoverArtPipe implements PipeTransform {
  transform(album: AlbumRecord): string {
    const sources = album.albumDetails?.coverArt?.sources;
    if (!sources?.length) return '';
    return sources.find(s => (s.height ?? 0) >= 640)?.url ?? sources[0].url;
  }
}