import { Component, input, output } from '@angular/core';

@Component({
  selector: 'lib-master-detail',
  imports: [],
  templateUrl: './master-detail.html',
  styleUrl: './master-detail.scss',
})
export class MasterDetail {

  readonly selectedItem = input<unknown | null>(null);

  readonly closeClicked = output<void>();

  closeDetail() {
    this.closeClicked.emit();
  }


}
