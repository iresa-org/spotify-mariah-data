import { Component, output } from '@angular/core';

@Component({
  selector: 'lib-file-upload',
  imports: [],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
})
export class FileUpload {

  fileSelected = output<File>();

  async onFileSelected(event: Event) {

    const files = (event.target as HTMLInputElement)?.files;

    if (files && files.item(0)) {

      this.fileSelected.emit(files.item(0)!)
    }
  }
}
