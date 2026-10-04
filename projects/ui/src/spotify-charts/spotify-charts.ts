import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

type ChartType = 'songs' | 'artists';
type RankMovement = 'up' | 'down' | 'tie';
type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
type RankBand = 'rank-1' | 'top-10' | 'top-50' | 'top-100' | 'top-200';

interface SongEntry {
  rank: number;
  name: string;
  artists: string[];
  streams: number;
  uri: string;
  previousRank: number;
  peakRank: number;
  appearancesOnChart: number;
  consecutiveAppearancesOnChart: number;
  entryStatus: string;
  peakDate: string;
  entryRank: number;
  entryDate: string;
}

interface ArtistEntry {
  rank: number;
  name: string;
  uri: string;
  previousRank: number;
  peakRank: number;
  appearancesOnChart: number;
  consecutiveAppearancesOnChart: number;
}

interface CountryChart<T> {
  entries: T[];
  updatedDate: string;
}

interface ChartPayload<T> {
  updatedDate: string;
  countries: Record<string, CountryChart<T>>;
}

interface GeoJsonFeature {
  properties: Record<string, string | null>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  } | null;
}

interface GeoJsonFeatureCollection {
  features: GeoJsonFeature[];
}

interface MapFeature {
  code: string;
  name: string;
  path: string;
  rankBand: RankBand | null;
}

interface ChartRow {
  countryCode: string;
  countryName: string;
  rank: number;
  name: string;
  artists?: string;
  uri?: string;
  streams?: number;
  previousRank?: number;
  peakRank?: number;
  appearancesOnChart?: number;
  consecutiveAppearancesOnChart?: number;
  entryStatus?: string;
  peakDate?: string;
  entryRank?: number;
  entryDate?: string;
}

const SONGS_URL = 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/test_data/charts/daily-song-charts.json';
const ARTISTS_URL = 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/test_data/charts/daily-artist-charts.json';
const GEO_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;

@Component({
  selector: 'lib-spotify-charts',
  templateUrl: './spotify-charts.html',
  styleUrl: './spotify-charts.scss',
})
export class SpotifyCharts implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  private mapRequest: Subscription | null = null;

  readonly chartType = signal<ChartType>('songs');
  readonly payload = signal<ChartPayload<SongEntry | ArtistEntry> | null>(null);
  readonly mapFeatures = signal<MapFeature[]>([]);
  readonly isMobile = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly isSongs = computed(() => this.chartType() === 'songs');
  readonly title = computed(() => this.isSongs() ? 'Song charts' : 'Artist charts');
  readonly subtitle = computed(() => this.isSongs()
    ? 'Where Mariah Carey songs are charting in Spotify\'s daily Top 200.'
    : 'Where Mariah Carey is charting as an artist in Spotify\'s daily Top 200.');
  readonly countries = computed(() => Object.keys(this.payload()?.countries ?? {}).length);
  readonly rows = computed<ChartRow[]>(() => {
    const countries = this.payload()?.countries ?? {};
    return Object.entries(countries).flatMap(([countryCode, country]) => country.entries.map((entry) => {
      const song = entry as SongEntry;
      const artist = entry as ArtistEntry;
      return {
        countryCode,
        countryName: this.countryName(countryCode),
        rank: entry.rank,
        name: entry.name,
        artists: song.artists?.join(', '),
        uri: song.uri,
        streams: song.streams,
        previousRank: artist.previousRank,
        peakRank: artist.peakRank,
        appearancesOnChart: artist.appearancesOnChart,
        consecutiveAppearancesOnChart: song.consecutiveAppearancesOnChart,
        entryStatus: song.entryStatus,
        peakDate: song.peakDate,
        entryRank: song.entryRank,
        entryDate: song.entryDate,
      };
    })).sort((a, b) => a.countryName.localeCompare(b.countryName) || a.rank - b.rank);
  });

  ngOnInit(): void {
    this.breakpointObserver
      .observe('(max-width: 1024px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        if (matches) {
          this.mapRequest?.unsubscribe();
          this.mapRequest = null;
          this.mapFeatures.set([]);
        } else {
          const payload = this.payload();
          if (payload) this.loadMap(payload);
        }
      });

    const routeType = this.route.snapshot.data['chartType'];
    this.chartType.set(routeType === 'artists' ? 'artists' : 'songs');
    const chartUrl = this.chartType() === 'songs' ? SONGS_URL : ARTISTS_URL;

    this.http.get<ChartPayload<SongEntry | ArtistEntry>>(chartUrl).subscribe({
      next: (payload) => {
        this.payload.set(payload);
        if (!this.isMobile()) this.loadMap(payload);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadMap(payload: ChartPayload<SongEntry | ArtistEntry>): void {
    if (this.mapRequest && !this.mapRequest.closed) return;

    this.mapRequest = this.http
      .get<GeoJsonFeatureCollection>(GEO_URL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (geoJson) => {
          if (!this.isMobile()) this.mapFeatures.set(this.createMapFeatures(geoJson, payload.countries));
        },
        error: () => this.mapFeatures.set([]),
      });
  }

  countryName(code: string): string {
    try {
      return this.displayNames.of(code) ?? code;
    } catch {
      return code;
    }
  }

  formatNumber(value: number | undefined): string {
    return value === undefined ? '-' : new Intl.NumberFormat('en-US').format(value);
  }

  rankMovement(status: string | undefined): RankMovement {
    if (status === 'MOVED_UP') return 'up';
    if (status === 'MOVED_DOWN') return 'down';
    return 'tie';
  }

  rankMovementLabel(rank: number, status: string | undefined): string {
    const movement = this.rankMovement(status);
    const label = movement === 'up' ? 'moved up' : movement === 'down' ? 'moved down' : 'no change';
    return `Rank ${rank}, ${label}`;
  }

  formatDate(value: string | undefined): string {
    return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '-';
  }

  formatStatus(value: string | undefined): string {
    return value ? value.replaceAll('_', ' ').toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase()) : '-';
  }

  spotifyUrl(uri: string | undefined): string | null {
    const trackId = uri?.replace('spotify:track:', '');
    return trackId ? `https://open.spotify.com/track/${trackId}` : null;
  }

  private createMapFeatures(geoJson: GeoJsonFeatureCollection, countries: Record<string, CountryChart<SongEntry | ArtistEntry>>): MapFeature[] {
    return geoJson.features.flatMap((feature) => {
      if (!feature.geometry) return [];
      const properties = feature.properties;
      const code = (properties['ISO_A2'] ?? properties['ISO_A2_EH'] ?? properties['ISO3166-1-Alpha-2'] ?? '').toUpperCase();
      if (!code || code === '-99') return [];
      const bestRank = countries[code]?.entries.reduce<number | null>(
        (best, entry) => best === null || entry.rank < best ? entry.rank : best,
        null,
      ) ?? null;
      return [{
        code,
        name: this.countryName(code),
        path: this.geometryPath(feature.geometry),
        rankBand: bestRank === null ? null : this.rankBand(bestRank),
      }];
    });
  }

  private rankBand(rank: number): RankBand | null {
    if (rank < 1 || rank > 200) return null;
    if (rank === 1) return 'rank-1';
    if (rank <= 10) return 'top-10';
    if (rank <= 50) return 'top-50';
    if (rank <= 100) return 'top-100';
    if (rank <= 200) return 'top-200';
    return null;
  }

  private geometryPath(geometry: GeoJsonFeature['geometry']): string {
    if (!geometry) return '';
    const polygons: Polygon[] = geometry.type === 'Polygon'
      ? [geometry.coordinates as Polygon]
      : geometry.coordinates as Polygon[];
    return polygons.flatMap((polygon) => polygon.map((ring) => this.ringPath(ring))).join(' ');
  }

  private ringPath(ring: Ring): string {
    return ring.map(([longitude, latitude], index) => {
      const x = (longitude + 180) / 360 * MAP_WIDTH;
      const y = (90 - latitude) / 180 * MAP_HEIGHT;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }
}
