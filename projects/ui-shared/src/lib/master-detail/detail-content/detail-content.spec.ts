import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailContent } from './detail-content';

describe('DetailContent', () => {
  let component: DetailContent;
  let fixture: ComponentFixture<DetailContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailContent],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailContent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
