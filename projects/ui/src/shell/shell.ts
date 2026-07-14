import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TrackHandler } from 'classic-ui';

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private trackHandler = inject(TrackHandler);

  readonly loaded = signal(false);
  readonly lastUpdated = signal('');

  ngOnInit(): void {
    this.trackHandler.loadTracks().subscribe({
      complete: () => {
        this.lastUpdated.set(this.trackHandler.getLastUpdated() ?? '');
        this.loaded.set(true);
      },
    });
  }
}
