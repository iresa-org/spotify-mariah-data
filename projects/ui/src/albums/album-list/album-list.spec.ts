import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DailyDataApi, HistoricDataApi } from 'ui-shared';

import { AlbumList } from './album-list';

describe('AlbumList', () => {
  let component: AlbumList;
  let fixture: ComponentFixture<AlbumList>;

  beforeEach(async () => {
    const dailyDataApiStub = {
      getAlbums: () => [
        {
          albumDetails: {
            uri: 'album-1',
            name: 'Album One',
            tracks: [],
          },
          dailyChanges: {
            count: 1000,
            change: 100,
            percentChange: 0.1,
          },
        },
      ],
      getLastUpdated: () => '2026-08-07',
    };

    const historicDataApiStub = {
      loadAllTimeRecords: () =>
        of({
          albums: { 'album-1': { date: '2026-08-07', change: '10' } },
          eps: { 'ep-1': { date: '2026-08-07', change: '20' } },
          tracks: {},
        }),
      loadYtdRecords: () =>
        of({
          albums: { 'album-1': { date: '2026-08-07', change: '10' } },
          eps: { 'ep-1': { date: '2026-08-07', change: '20' } },
          tracks: {},
        }),
    };

    await TestBed.configureTestingModule({
      imports: [AlbumList],
      providers: [
        { provide: DailyDataApi, useValue: dailyDataApiStub },
        { provide: HistoricDataApi, useValue: historicDataApiStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should recognize all-time and year records for the latest update day', () => {
    expect(component.hasRecord('album-1', 'allTime')).toBe(true);
    expect(component.hasRecord('album-1', 'ytd')).toBe(true);
  });

  it('should use EP record data when displaying EPs', () => {
    const epFixture = TestBed.createComponent(AlbumList);
    epFixture.componentRef.setInput('recordCollection', 'eps');
    epFixture.detectChanges();

    expect(epFixture.componentInstance.hasRecord('ep-1', 'allTime')).toBe(true);
    expect(epFixture.componentInstance.hasRecord('ep-1', 'ytd')).toBe(true);
  });
});
