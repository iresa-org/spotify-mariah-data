import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumRanking } from './album-ranking';

describe('AlbumRanking', () => {
  let component: AlbumRanking;
  let fixture: ComponentFixture<AlbumRanking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumRanking],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumRanking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
