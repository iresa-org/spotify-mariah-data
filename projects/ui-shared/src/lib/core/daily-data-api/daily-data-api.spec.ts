import { TestBed } from '@angular/core/testing';

import { StreamingDataApi } from './daily-data-api';

describe('StreamingDataApi', () => {
  let service: StreamingDataApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StreamingDataApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
