import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TrackHandler } from './track-handler';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  trackHandler = inject(TrackHandler);

  loaded = signal<boolean>(false);

  ngOnInit() {
    this.loadTracks();
  }

  loadTracks() {
    this.trackHandler.loadTracks().subscribe({
      complete: () => this.loaded.set(true)
    });
  }


}
