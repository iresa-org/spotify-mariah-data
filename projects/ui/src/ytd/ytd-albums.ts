import { Component } from '@angular/core';
import { YtdTopAlbums } from './top-albums/top-albums';
import { YtdHeader } from './ytd-header';
import { YtdPage } from './ytd-page';

@Component({
  selector: 'lib-ytd-albums-page',
  imports: [YtdHeader, YtdTopAlbums],
  templateUrl: './ytd-albums.html',
  styleUrl: './ytd.scss',
})
export class YtdAlbums extends YtdPage {
  declare readonly loading: YtdPage['loading'];
  declare readonly selectedPeriod: YtdPage['selectedPeriod'];
  declare readonly periodOptions: YtdPage['periodOptions'];
  declare readonly periodLabel: YtdPage['periodLabel'];
  declare readonly isYtdPeriod: YtdPage['isYtdPeriod'];
  declare readonly albumTotals: YtdPage['albumTotals'];
  declare selectPeriod: YtdPage['selectPeriod'];
}