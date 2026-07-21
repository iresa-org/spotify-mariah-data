import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterDetail } from './master-detail';

describe('MasterDetail', () => {
  let component: MasterDetail;
  let fixture: ComponentFixture<MasterDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
