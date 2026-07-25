import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AlbumRecord } from '../album.config';
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
export class AlbumTrackDialog {
  readonly data = inject<AlbumTrackDialogData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<unknown, AlbumTrackDialog>);

  close(): void {
    this.dialogRef.close();
  }
}