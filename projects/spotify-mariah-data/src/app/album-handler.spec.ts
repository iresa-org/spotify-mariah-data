import { TestBed } from '@angular/core/testing';

import { AlbumHandler } from './album-handler';

describe('AlbumHandler', () => {
  let service: AlbumHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlbumHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
