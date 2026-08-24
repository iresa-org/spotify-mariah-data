import { DOCUMENT } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DailyDataApi, HistoricDataApi } from 'ui-shared';
import { Tracks } from './tracks';

describe('Tracks', () => {
  let component: Tracks;
  let fixture: ComponentFixture<Tracks>;

  beforeEach(async () => {
    const dailyDataApiStub = {
      getAll: () => [
        { uid: 'track-1', name: 'Zebra', playcount: 100, change: 10, percent: 0, artists: [] },
        { uid: 'track-2', name: 'Apple', playcount: 200, change: 20, percent: 0.5, artists: [] },
      ],
      getLead: () => [],
      getSolo: () => [],
      getFeatured: () => [],
      getVideos: () => [],
      getTrackByUid: () => null,
      getLastUpdated: () => '2026-08-07',
    };

    const historicDataApiStub = {
      loadAllTimeRecords: () => of({ tracks: { 'track-1': { date: '2026-08-07', change: '10' } } }),
      loadYtdRecords: () => of({ tracks: { 'track-1': { date: '2026-08-07', change: '10' } } }),
    };

    await TestBed.configureTestingModule({
      imports: [Tracks],
      providers: [
        { provide: DailyDataApi, useValue: dailyDataApiStub },
        { provide: HistoricDataApi, useValue: historicDataApiStub },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: {
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
              scrollTo: () => undefined,
              scrollY: 0,
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tracks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should recognize all-time and year records for the latest update day', () => {
    expect(component.hasRecord('track-1', 'allTime')).toBeTrue();
    expect(component.hasRecord('track-1', 'ytd')).toBeTrue();
  });

  it('cycles a desktop column through ascending, descending, and default sorting', () => {
    component.sortBy('name');
    expect(component.list().map(track => track.uid)).toEqual(['track-2', 'track-1']);
    expect(component.getAriaSort('name')).toBe('ascending');

    component.sortBy('name');
    expect(component.list().map(track => track.uid)).toEqual(['track-1', 'track-2']);
    expect(component.getAriaSort('name')).toBe('descending');

    component.sortBy('name');
    expect(component.list().map(track => track.uid)).toEqual(['track-2', 'track-1']);
    expect(component.getAriaSort('name')).toBe('none');
  });
});
