import { Component, OnDestroy, signal, input } from '@angular/core';
import { Subscription, timer } from 'rxjs';

export interface AdConfig {
  title: string;
  url?: string;
  description?: string;
  img?: string;
  backgroundColor?: string;
  textColor?: string;
  actionText?: string;
}

@Component({
  selector: 'lib-ad-banner',
  templateUrl: './ad-banner.html',
  styleUrl: './ad-banner.scss',
})
export class AdBannerComponent implements OnDestroy {
  readonly ads = input<AdConfig[]>([]);
  readonly visible = signal(false);
  readonly selectedAd = signal<AdConfig | null>(null);

  private cycleSub: Subscription | null = null;
  private visibleSub: Subscription | null = null;

  private readonly cycleMs = 40_000; // show a new ad every 40s
  private readonly visibleMs = 20_000; // visible for 20s

  constructor() {
    this.scheduleNext();
  }

  private pickRandomAd(): AdConfig | null {
    const ads = this.ads();
    if (ads.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * ads.length);
    return ads[index] ?? null;
  }

  private showOnce() {
    this.selectedAd.set(this.pickRandomAd());
    this.visible.set(true);
    if (this.visibleSub != null) {
      this.visibleSub.unsubscribe();
      this.visibleSub = null;
    }
    this.visibleSub = timer(this.visibleMs).subscribe(() => {
      this.visible.set(false);
      if (this.visibleSub) {
        this.visibleSub.unsubscribe();
        this.visibleSub = null;
      }
    });
  }

  private scheduleNext() {
    this.cycleSub = timer(this.cycleMs, this.cycleMs).subscribe(() => this.showOnce());
  }

  ngOnDestroy(): void {
    if (this.cycleSub != null) {
      this.cycleSub.unsubscribe();
      this.cycleSub = null;
    }
    if (this.visibleSub != null) {
      this.visibleSub.unsubscribe();
      this.visibleSub = null;
    }
  }
}
