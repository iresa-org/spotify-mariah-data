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

@Service()
export class UiDataService {
  private http = inject(HttpClient);
  private _monthly: MonthlyData | null = null;

  loadMonthly(): Observable<MonthlyData> {
    if (this._monthly) return of(this._monthly);
    const params = new HttpParams().append('salt', Date.now());
    return this.http.get<MonthlyData>(`${BASE}/ytd/monthly.json`, { params }).pipe(
      tap(data => (this._monthly = data))
    );
  }

  getMonthly(): MonthlyData | null {
    return this._monthly;
  }
}
