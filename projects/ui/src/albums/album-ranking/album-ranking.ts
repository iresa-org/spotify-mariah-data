import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { DetailContent, MasterContent, MasterDetail } from 'ui-shared';
import { AlbumRecord } from '../album.config';
import { AlbumList } from '../album-list/album-list';
import { AlbumTrackList } from '../album-track-list/album-track-list';
import { AlbumTrackDialog } from './album-track-dialog';

@Component({
  selector: 'lib-album-ranking',
  imports: [MasterDetail, MasterContent, DetailContent, AlbumList, AlbumTrackList],
  templateUrl: './album-ranking.html',
  styleUrl: './album-ranking.scss',
})
export class AlbumRanking {
  private readonly dialog = inject(Dialog);

  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly masterDetail = viewChild.required('masterDetail', {
    read: ElementRef<HTMLElement>,
  });

  private dialogRef: DialogRef<unknown, AlbumTrackDialog> | null = null;

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  readonly selectedAlbum = signal<AlbumRecord | null>(null);

  constructor() {
    effect(() => {
      if (!this.isMobile()) {
        this.closeDialog();
      }
    });
  }

  onAlbumSelected($event: AlbumRecord | null) {
    if (this.isMobile()) {
      this.selectedAlbum.set($event);
      if (!$event) {
        this.closeDialog();
        return;
      }

      this.openDialog($event);
      this.scrollMasterDetailToTop();
      return;
    }

    this.closeDialog();
    this.selectedAlbum.set($event);
    if ($event) {
      this.scrollMasterDetailToTop();
    }
  }

  closeAlbum(): void {
    this.closeDialog();
    this.selectedAlbum.set(null);
  }

  closeClicked(): void {
    this.closeDialog();
    this.selectedAlbum.set(null);
  }

  private openDialog(album: AlbumRecord): void {
    this.closeDialog();
    this.dialogRef = this.dialog.open(AlbumTrackDialog, {
      ariaLabel: album.albumDetails.name + ' tracks',
      data: { album },
      maxWidth: '96vw',
      width: 'min(960px, 96vw)',
    });

    this.dialogRef.closed.subscribe(() => {
      this.dialogRef = null;
      if (this.isMobile()) {
        this.selectedAlbum.set(null);
      }
    });
  }

  private closeDialog(): void {
    if (!this.dialogRef) return;
    this.dialogRef.close();
    this.dialogRef = null;
  }

  private scrollMasterDetailToTop(): void {
    requestAnimationFrame(() => {
      const masterDetailEl = this.masterDetail().nativeElement;
      const scrollContainer = this.findScrollContainer(masterDetailEl);

      masterDetailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });

      masterDetailEl.scrollTop = 0;
      for (const panel of masterDetailEl.querySelectorAll('.master, .detail')) {
        if (panel instanceof HTMLElement) {
          panel.scrollTop = 0;
        }
      }
    });
  }

  private findScrollContainer(start: HTMLElement): HTMLElement | null {
    let current = start.parentElement;

    while (current) {
      const style = getComputedStyle(current);
      const canScrollY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight;

      if (canScrollY) {
        return current;
      }

      current = current.parentElement;
    }

    return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
  }

}
