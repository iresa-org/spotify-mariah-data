import { Component } from '@angular/core';
import { YtdTopTracks } from './top-tracks/top-tracks';
import { YtdHeader } from './ytd-header';
import { YtdPage } from './ytd-page';

@Component({
  selector: 'lib-ytd-tracks-page',
  imports: [YtdHeader, YtdTopTracks],
  templateUrl: './ytd-tracks.html',
  styleUrl: './ytd.scss',
})
export class YtdTracks extends YtdPage {
  declare readonly loading: YtdPage['loading'];
  declare readonly selectedPeriod: YtdPage['selectedPeriod'];
  declare readonly periodOptions: YtdPage['periodOptions'];
  declare readonly periodLabel: YtdPage['periodLabel'];
  declare readonly isYtdPeriod: YtdPage['isYtdPeriod'];
  declare readonly topTracks: YtdPage['topTracks'];
  declare selectPeriod: YtdPage['selectPeriod'];
}