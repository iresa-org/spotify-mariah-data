import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumRecord } from '../album.config';
import { AlbumTrackList } from './album-track-list';

describe('AlbumTrackList', () => {
  let component: AlbumTrackList;
  let fixture: ComponentFixture<AlbumTrackList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumTrackList],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumTrackList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include a collapsed summary row for each disc', () => {
    const album: AlbumRecord = {
      albumDetails: {
        name: 'Test album',
        uri: 'album-uri',
        tracks: [
          {
            uid: 'track-1',
            name: 'Track 1',
            playcount: 10,
            change: 2,
            percent: 0.2,
            discNumber: 1,
            trackNumber: 1,
          },
          {
            uid: 'track-2',
            name: 'Track 2',
            playcount: 20,
            change: 3,
            percent: 0.15,
            discNumber: 1,
            trackNumber: 2,
          },
          {
            uid: 'track-3',
            name: 'Track 3',
            playcount: 5,
            change: 1,
            percent: 0.1,
            discNumber: 2,
            trackNumber: 1,
          },
        ],
      },
      dailyChanges: {
        count: 35,
        change: 6,
        percentChange: 0.17,
      },
    };

    fixture.componentRef.setInput('selectedAlbum', album);
    fixture.detectChanges();

    const groups = component.tableGroups();

    expect(groups[0].collapsedSummaryRows).toEqual([
      jasmine.objectContaining({
        trackName: 'Disc 1 total',
        total: 30,
        daily: 5,
        change: 5 / 30,
      }),
    ]);
    expect(groups[1].collapsedSummaryRows).toEqual([
      jasmine.objectContaining({
        trackName: 'Disc 2 total',
        total: 5,
        daily: 1,
        change: 0.1,
      }),
    ]);
  });
});
