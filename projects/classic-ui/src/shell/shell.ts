import { Component, ElementRef, HostListener, inject, OnInit, Renderer2, signal, viewChild } from '@angular/core';
import { TrackHandler } from '../track-handler';
import { WINDOW } from 'ui-shared';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {

  scrollTopBtn = viewChild<ElementRef<HTMLButtonElement>>('scrollTop');

  trackHandler = inject(TrackHandler);

  loaded = signal<boolean>(false);

  window = inject(WINDOW)

  renderer = inject(Renderer2);

  lastUpdated = signal<string>('');

  @HostListener('window:scroll')
  onScroll() {
    this.onWindowScroll();
  }

  ngOnInit() {
    this.loadTracks();
  }

  loadTracks() {
    this.trackHandler.loadTracks().subscribe({
      complete: () => {
        this.lastUpdated.set(this.trackHandler.getLastUpdated())
        this.loaded.set(true)
      }
    });
  }

  scrollToTop() {
    this.window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onWindowScroll() {
    if (this.scrollTopBtn()?.nativeElement) {
      const document = this.window.document;
      if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        this.renderer.setStyle(this.scrollTopBtn()!.nativeElement, 'display', 'block');
      } else {
        this.renderer.setStyle(this.scrollTopBtn()?.nativeElement, 'display', 'none');
      }
    }
  }
}
