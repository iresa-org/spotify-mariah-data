import { TestBed } from '@angular/core/testing';

import { PlayCountHandler } from './play-count-handler';

describe('PlayCountHandler', () => {
  let service: PlayCountHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayCountHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
