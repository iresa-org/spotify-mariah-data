import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DailyDataApi } from 'ui-shared';

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private dailyDataApi = inject(DailyDataApi);

  readonly loaded = signal(false);
  readonly lastUpdated = signal('');

  ngOnInit(): void {
    this.dailyDataApi.loadTracks().subscribe({
      complete: () => {
        this.lastUpdated.set(this.dailyDataApi.getLastUpdated() ?? '');
        this.loaded.set(true);
      },
    });
  }
}
