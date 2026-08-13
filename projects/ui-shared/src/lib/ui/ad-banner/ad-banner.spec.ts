import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdBannerComponent } from './ad-banner';

describe('AdBannerComponent', () => {
  let component: AdBannerComponent;
  let fixture: ComponentFixture<AdBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdBannerComponent);
    component = fixture.componentInstance;
    component.ads = [
      { title: 'First ad', url: 'https://example.com/first', actionText: 'Shop now' },
      { title: 'Second ad', url: 'https://example.com/second', actionText: 'Learn more' },
      { title: 'Third ad', url: 'https://example.com/third', actionText: 'Watch now' },
    ];
    fixture.detectChanges();
  });

  it('should pick a random ad on each interval', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.75;

    component['showOnce']();

    expect(component.selectedAd()).toEqual(component.ads[2]);

    Math.random = originalRandom;
  });
});
