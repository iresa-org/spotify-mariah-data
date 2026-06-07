import { Component, ElementRef, HostListener, inject, OnInit, Renderer2, signal, viewChild } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TrackHandler } from './track-handler';
import { WINDOW } from './window-injection-token';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  scrollTopBtn = viewChild<ElementRef<HTMLButtonElement>>('scrollTop');

  trackHandler = inject(TrackHandler);

  loaded = signal<boolean>(false);

  window = inject(WINDOW)

  renderer = inject(Renderer2);

  @HostListener('window:scroll')
  onScroll() {
    this.onWindowScroll();
  }

  ngOnInit() {
    this.loadTracks();
  }

  loadTracks() {
    this.trackHandler.loadTracks().subscribe({
      complete: () => this.loaded.set(true)
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
