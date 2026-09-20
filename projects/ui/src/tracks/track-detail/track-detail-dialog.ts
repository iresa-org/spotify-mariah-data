import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TrackDetail } from './track-detail';

type TrackDetailDialogData = {
  uid: string;
};

@Component({
  selector: 'lib-track-detail-dialog',
  imports: [TrackDetail],
  template: `
    <div class="track-detail-dialog">
      <div class="track-detail-dialog__close">
        <button type="button" (click)="close()" aria-label="Close track details">Close</button>
      </div>
      <lib-track-detail [trackUid]="data.uid"></lib-track-detail>
    </div>
  `,
  styles: [`
    .track-detail-dialog {
      background: #ffffff;
      max-height: min(90dvh, 720px);
      overflow: auto;
      padding: 12px;
    }

    .track-detail-dialog__close {
      display: flex;
      justify-content: flex-end;
    }

    .track-detail-dialog__close button {
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
  `],
})
export class TrackDetailDialog {
  readonly data = inject<TrackDetailDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<unknown, TrackDetailDialog>);

  close(): void {
    this.dialogRef.close();
  }
}