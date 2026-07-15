import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

const BASE = 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/data';

export interface MonthData {
  month: string;
  total: string;
}

export interface MonthlyData {
  months: MonthData[];
}

export interface TrackRecord {
  uid: string;
  change: string;
  date: string;
}

export interface YtdEntry {
  uid: string;
  ytd: string;
}

export interface YtdData {
  tracks: YtdEntry[];
}

/** uid → { date → streamCount } */
export type HistoricalData = Record<string, Record<string, string>>;

@Service()
export class UiDataService {
  private http = inject(HttpClient);
  private _monthly: MonthlyData | null = null;
  private _allTimeRecords: TrackRecord[] | null = null;
  private _ytdRecords: TrackRecord[] | null = null;
  private _ytd: YtdData | null = null;
  private _historical: HistoricalData | null = null;

  private params() {
    return new HttpParams().append('salt', Date.now());
  }

  loadMonthly(): Observable<MonthlyData> {
    if (this._monthly) return of(this._monthly);
    return this.http.get<MonthlyData>(`${BASE}/ytd/monthly.json`, { params: this.params() }).pipe(
      tap(data => (this._monthly = data))
    );
  }

  getMonthly(): MonthlyData | null {
    return this._monthly;
  }

  loadAllTimeRecords(): Observable<TrackRecord[]> {
    if (this._allTimeRecords) return of(this._allTimeRecords);
    return this.http.get<TrackRecord[]>(`${BASE}/records/allTime.json`, { params: this.params() }).pipe(
      tap(data => (this._allTimeRecords = data))
    );
  }

  loadYtdRecords(): Observable<TrackRecord[]> {
    if (this._ytdRecords) return of(this._ytdRecords);
    return this.http.get<TrackRecord[]>(`${BASE}/records/year.json`, { params: this.params() }).pipe(
      tap(data => (this._ytdRecords = data))
    );
  }

  loadYtd(): Observable<YtdData> {
    if (this._ytd) return of(this._ytd);
    return this.http.get<YtdData>(`${BASE}/ytd/ytd.json`, { params: this.params() }).pipe(
      tap(data => (this._ytd = data))
    );
  }

  loadHistorical(): Observable<HistoricalData> {
    if (this._historical) return of(this._historical);
    return this.http.get<HistoricalData>(`${BASE}/historical/tracks.json`, { params: this.params() }).pipe(
      tap(data => (this._historical = data))
    );
  }
}
