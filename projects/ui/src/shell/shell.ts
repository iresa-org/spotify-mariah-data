import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAnglesLeft, faAnglesRight, faChartLine, faCompactDisc, faMusic } from '@fortawesome/free-solid-svg-icons';
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
  readonly minimizeIcon = faAnglesLeft;
  readonly expandIcon = faAnglesRight;
  readonly overviewIcon = faChartLine;
  readonly tracksIcon = faMusic;
  readonly albumsIcon = faCompactDisc;

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
        this.loaded.set(true);
      },
    });
  }
}
