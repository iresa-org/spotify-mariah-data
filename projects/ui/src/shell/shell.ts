import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAnglesLeft, faAnglesRight, faCalendarDays, faChartLine, faChevronDown, faChevronUp, faCompactDisc, faMusic, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faTiktok, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdBannerComponent, DailyDataApi } from 'ui-shared';
import { AdConfig } from '../../../ui-shared/src/lib/ui/ad-banner/ad-banner';

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FontAwesomeModule, AdBannerComponent],
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
  readonly openMobileSubmenuRoute = signal<string | null>(null);
  readonly openMobileSubmenu = computed(() => this.navItems.find((item) => item.route === this.openMobileSubmenuRoute()));
  readonly externalLinks = signal<{ name: string; url: string; icon: IconDefinition }[]>([]);
  readonly artistImage = signal<string | null>(null);
  readonly worldRank = signal<number>(0);

  readonly minimizeIcon = faAnglesLeft;
  readonly expandIcon = faAnglesRight;
  readonly overviewIcon = faChartLine;
  readonly tracksIcon = faMusic;
  readonly albumsIcon = faCompactDisc;
  readonly ytdIcon = faCalendarDays;
  readonly closeIcon = faXmark;
  readonly submenuExpandIcon = faChevronDown;
  readonly submenuCollapseIcon = faChevronUp;
  readonly navItems = [
    { route: 'overview', label: 'Overview', icon: this.overviewIcon, children: [] },
    { route: 'tracks', label: 'Tracks', icon: this.tracksIcon, children: [] },
    { route: 'albums', label: 'Albums', icon: this.albumsIcon, children: [] },
    {
      route: 'ytd',
      label: 'YTD',
      icon: this.ytdIcon,
      children: [
        { label: 'Tracks', route: 'ytd/tracks' },
        { label: 'Albums', route: 'ytd/albums' },
      ],
    },
  ];

  readonly ads: AdConfig[] = [
    {
      title: 'Mariah Carey Stationhead Streaming Party is happening now',
      url: 'https://www.stationhead.com/c/lambs',
      img: 'https://stationhead-production1-images.s3.amazonaws.com/images/Channel/logo/672/f6ed0974-7ed7-46c1-8102-845d8d9eb5de.png',
      backgroundColor: "#e5a193",
      textColor: '#ffffff',
      actionText: 'Join Now',
      sponsored: true
    },
    {
      title: 'Stream Mariah Carey\'s latest album \'Here For It All\'',
      url: 'https://open.spotify.com/album/6MljmKZLh52AUR1v5WpWst',
      img: 'https://i.scdn.co/image/ab67616d0000b2738923b2fb0074a7a01ce01571',
      backgroundColor: "#333333",
      textColor: '#FFFFFF',
      actionText: 'Stream Now'
    },
    {
      title: '\'Daydream30\' is OUT now',
      url: 'https://open.spotify.com/album/3KGlZ9YeHexP80A3scG86n',
      img: 'https://i.scdn.co/image/ab67616d0000485100f00f307ab0026f13e26b45',
      backgroundColor: "#383838",
      textColor: '#FFFFFF',
      actionText: 'See here'
    }]

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

  toggleSubmenu(route: string): void {
    this.openMobileSubmenuRoute.update((openRoute) => openRoute === route ? null : route);
  }

  closeMobileSubmenu(): void {
    this.openMobileSubmenuRoute.set(null);
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe('(max-width: 1024px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        this.sidenavMinimized.set(matches);
        this.openMobileSubmenuRoute.set(null);
      });

    this.dailyDataApi.loadTracks().subscribe({
      complete: () => {
        this.lastUpdated.set(this.dailyDataApi.getLastUpdated() ?? '');
        this.artistImage.set(this.dailyDataApi.getAvatarImage());
        this.externalLinks.set(this.dailyDataApi.getExternalLinks().map(link => ({
          ...link,
          icon: this.resolveIcon(link.name),
        })));
        this.worldRank.set(this.dailyDataApi.getWorldRank());
        this.loaded.set(true);
      },
    });
  }
}
