import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { DetailContent, MasterContent, MasterDetail } from 'ui-shared';
import { AlbumRecord } from '../album.config';
import { AlbumList } from '../album-list/album-list';
import { AlbumTrackList } from '../album-track-list/album-track-list';

type AlbumTrackDialogData = {
  album: AlbumRecord;
};

@Component({
  selector: 'lib-album-track-dialog',
  imports: [AlbumTrackList],
  template: `
    <div class="album-track-dialog">
      <div class="album-track-dialog__close">
        <button type="button" (click)="close()" aria-label="Close album tracks dialog">Close</button>
      </div>
      <lib-album-track-list [selectedAlbum]="data.album"></lib-album-track-list>
    </div>
  `,
  styles: [
    `
      .album-track-dialog {
        background: #ffffff;
        max-height: min(90dvh, 720px);
        overflow: auto;
        padding: 12px;
      }

      .album-track-dialog__close {
        display: flex;
        justify-content: flex-end;
      }

      .album-track-dialog__close button {
        background: transparent;
        border: 1px solid #d8d6d4;
        border-radius: 999px;
        color: #605e5c;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1;
        margin-bottom: 10px;
        padding: 0.55rem 0.8rem;
      }
    `,
  ],
})
class AlbumTrackDialog {
  readonly data = inject<AlbumTrackDialogData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<unknown, AlbumTrackDialog>);

  close(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'lib-album-ranking',
  imports: [MasterDetail, MasterContent, DetailContent, AlbumList, AlbumTrackList],
  templateUrl: './album-ranking.html',
  styleUrl: './album-ranking.scss',
})
export class AlbumRanking {
  private readonly dialog = inject(Dialog);

  private readonly breakpointObserver = inject(BreakpointObserver);

  private dialogRef: DialogRef<unknown, AlbumTrackDialog> | null = null;

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  readonly selectedAlbum = signal<AlbumRecord | null>(null);

  onAlbumSelected($event: AlbumRecord | null) {
    if (this.isMobile()) {
      this.selectedAlbum.set($event);
      if (!$event) {
        this.closeDialog();
        return;
      }

      this.openDialog($event);
      return;
    }

    this.closeDialog();
    this.selectedAlbum.set($event);
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

}
