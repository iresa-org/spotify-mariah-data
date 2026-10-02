import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DailyDataApi } from './daily-data-api';

describe('DailyDataApi', () => {
  let service: DailyDataApi;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DailyDataApi);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('loads the albums JSON and exposes its album records', () => {
    const albums = [
      {
        albumDetails: { name: 'Mariah Carey', uri: 'spotify:album:example', tracks: [] },
        dailyChanges: { count: '100', change: '10', percentChange: '0.1' },
      },
    ];

    service.loadAlbums().subscribe((result) => expect(result).toEqual(albums));

    const request = httpTestingController.expectOne((req) =>
      req.url === 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/test_data/result/albums.json'
    );
    request.flush(albums);

    expect(service.getAlbums()).toEqual(albums);
  });

  it('loads the EPs JSON and exposes its EP records', () => {
    const eps = [
      {
        albumDetails: { name: 'Someday EP', uri: 'spotify:album:example-ep', tracks: [] },
        dailyChanges: { count: '100', change: '10', percentChange: '0.1' },
      },
    ];

    service.loadEps().subscribe((result) => expect(result).toEqual(eps));

    const request = httpTestingController.expectOne((req) =>
      req.url === 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/test_data/result/eps.json'
    );
    request.flush(eps);

    expect(service.getEps()).toEqual(eps);
  });
});
