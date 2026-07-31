import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAnglesLeft, faAnglesRight, faChartLine, faCompactDisc, faMusic } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faTiktok, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DailyDataApi } from 'ui-shared';

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private dailyDataApi = inject(DailyDataApi);
  private breakpointObserver = inject(BreakpointObserver);
  private destroyRef = inject(DestroyRef);

  readonly loaded = signal(false);
  readonly lastUpdated = signal('');
  readonly isMobile = signal(false);
  readonly sidenavMinimized = signal(false);
  readonly externalLinks = signal<{ name: string; url: string; icon: IconDefinition }[]>([]);
  readonly artistImage = signal<string | null>(null);
  readonly minimizeIcon = faAnglesLeft;
  readonly expandIcon = faAnglesRight;
  readonly overviewIcon = faChartLine;
  readonly tracksIcon = faMusic;
  readonly albumsIcon = faCompactDisc;

  private readonly brandIconMap: Record<string, IconDefinition> = {
    FACEBOOK: faFacebook,
    INSTAGRAM: faInstagram,
    TIKTOK: faTiktok,
    TWITTER: faXTwitter,
  };

  private resolveIcon(name: string): IconDefinition {
    return this.brandIconMap[name.toUpperCase()] ?? faXTwitter;
  }

  toggleSidenav(): void {
    this.sidenavMinimized.update((isMinimized) => !isMinimized);
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe('(max-width: 1024px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        this.sidenavMinimized.set(matches);
      });

    this.dailyDataApi.loadTracks().subscribe({
      complete: () => {
        this.lastUpdated.set(this.dailyDataApi.getLastUpdated() ?? '');
        this.artistImage.set(this.dailyDataApi.getAvatarImage());
        this.externalLinks.set(this.dailyDataApi.getExternalLinks().map(link => ({
          ...link,
          icon: this.resolveIcon(link.name),
        })));
        this.loaded.set(true);
      },
    });
  }
}
