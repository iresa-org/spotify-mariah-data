import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterContent } from './master-content';

describe('MasterContent', () => {
  let component: MasterContent;
  let fixture: ComponentFixture<MasterContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterContent],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterContent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
