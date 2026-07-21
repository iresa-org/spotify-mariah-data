import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
