import { Component, inject } from '@angular/core';
import { FileUpload } from 'ui-shared';
import { TrackHandler } from '../track-handler';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test',
  imports: [FileUpload],
  templateUrl: './test.html',
  styleUrl: './test.scss',
})
export class Test {

  curr: string = '';
  prev: string = '';
  trackHandler = inject(TrackHandler);
  router = inject(Router)

  async onCurrFileSelected(file: File) {
    this.curr = await file.text();
  }

  async onPrevFileSelected(file: File) {
    this.prev = await file.text();
  }

  submit() {
    if (this.curr && this.prev)
      //this.trackHandler.processDailyChanges(JSON.parse(this.curr), JSON.parse(this.prev))
      this.router.navigate(['/tracks'])
  }
}
