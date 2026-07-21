import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumList } from './album-list';

describe('AlbumList', () => {
  let component: AlbumList;
  let fixture: ComponentFixture<AlbumList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumList],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
