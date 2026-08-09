import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { forkJoin, fromEvent, map, startWith } from 'rxjs';
import { DailyDataApi, FormatCompactPipe, HistoricDataApi } from 'ui-shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface YtdTrack {
  uid: string;
  name: string;
  albumName: string;
  ytdCount: number;
  coverArt?: string;
}

interface AlbumYtd {
  uri: string;
  name: string;
  ytdCount: number;
  image?: string;
}

@Component({
  selector: 'lib-ytd',
  standalone: true,
  imports: [CommonModule, FormatCompactPipe, ScrollingModule],
  templateUrl: './ytd.html',
  styleUrl: './ytd.scss',
})
export class Ytd implements OnInit {
  private readonly dailyDataApi = inject(DailyDataApi);
  private readonly historicDataApi = inject(HistoricDataApi);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly topTracks = signal<YtdTrack[]>([]);
  readonly albumTotals = signal<AlbumYtd[]>([]);
  readonly trackCount = computed(() => this.topTracks().length);
  readonly showScrollToTop = signal(false);

  ngOnInit(): void {
    const scrollTarget = this.document.defaultView;
    if (scrollTarget) {
      fromEvent(scrollTarget, 'scroll')
        .pipe(
          startWith(null),
          map(() => scrollTarget.scrollY > 280),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((shouldShow) => {
          this.showScrollToTop.set(shouldShow);
        });
    }
    forkJoin({
      tracksLoaded: this.dailyDataApi.loadTracks(),
      ytd: this.historicDataApi.loadYtd(),
    }).subscribe({
      next: ({ ytd }) => {
        const allTracks = this.dailyDataApi.getAll();
        const trackMap = new Map<string, any>();
        const albumMap = new Map<string, { name: string; image?: string }>();

        allTracks.forEach((track: any) => {
          if (track.uid) {
            trackMap.set(track.uid, track);
          }
          const album = track.album;
          if (album?.uri && !albumMap.has(album.uri)) {
            albumMap.set(album.uri, {
              name: album.name ?? album.uri,
              image: album.coverArt?.sources?.[0]?.url,
            });
          }
        });

        const tracks = Object.entries(ytd.tracks || {}).
          map(([uid, count]) => {
            const track = trackMap.get(uid);
            return {
              uid,
              name: track?.name,
              albumName: track?.album?.name ?? '',
              ytdCount: Number(count),
              coverArt: track?.album?.coverArt?.sources?.[0]?.url,
            } as YtdTrack;
          }).
          filter((track) => track.ytdCount > 0).
          sort((a, b) => b.ytdCount - a.ytdCount)
;

        this.topTracks.set(tracks.slice(0, 200).filter(track => !!track.name));

        const albums = Object.entries(ytd.albums || {}).map(([uri, count]) => ({
          uri,
          name: albumMap.get(uri)?.name ?? uri,
          image: albumMap.get(uri)?.image,
          ytdCount: Number(count),
        })).sort((a, b) => b.ytdCount - a.ytdCount);

        this.albumTotals.set(albums);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
