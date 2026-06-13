import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, take, tap } from 'rxjs';

const GET_DATA_URL = 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/data/result/current.json'

@Injectable({
  providedIn: 'root',
})
export class TrackHandler {


  private currMap = new Map<string, any>;

  private countIdMap = new Map<number, string[]>();

  private allList: any[] | null = null;

  private leadList: any[] | null = null;

  private soloList: any[] | null = null;

  private featuredList: any[] | null = null;

  private videoList: any[] | null = null;

  private http = inject(HttpClient);

  loadTracks(): Observable<any> {
    if (this.currMap.size > 0) {
      return of(true).pipe(take(1))
    }
    let params = new HttpParams();
    params = params.append('salt', (new Date()).getTime())
    return this.http.get<any[]>(GET_DATA_URL, { params }).pipe(
      tap((data) => this.processTrackList(data))
    )
  }

  processTrackList(list: any[]) {
    list.forEach((item) => {
      const { org, dailyChanges } = item;
      const { uid, itemV2 } = org;
      if (uid && !this.currMap.has(uid)) {
        const percent = Number(dailyChanges.prevChange) ? (Number(dailyChanges.change) - Number(dailyChanges.prevChange)) / Number(dailyChanges.prevChange) : 0
        this.currMap.set(uid, {
          uid,
          name: itemV2?.data?.name,
          playcount: dailyChanges.currTotal,
          change: dailyChanges.change,
          percent: String(percent),
          artists: itemV2?.data?.artists.items,
          album: itemV2?.data.albumOfTrack,
          discNumber: itemV2?.data?.discNumber,
          trackNumber: itemV2?.data?.trackNumber,
          associationsV3: itemV2?.data?.associationsV3,
          mediaType: itemV2?.data?.mediaType
        });
      }
    });
  }

  getAll = () => {
    if (!this.allList) {
      const list = Array.from(this.currMap!.values());
      list.forEach(item => {
        if (!this.countIdMap.has(item.playcount)) {
          this.countIdMap.set(item.playcount, [item.uid])
        } else {
          this.countIdMap.set(item.playcount, [...this.countIdMap.get(item.playcount)!, item.uid])
        }
      })
      const duplicates = this.getDuplicates(this.countIdMap);
      this.allList = list.filter(item => !duplicates.has(item.uid));
    }
    return this.allList
  }

  getLead = () => {
    if (!this.leadList) {
      this.leadList = this.getAll().filter(item => this.containsMainArtist(item.artists));
    }
    return this.leadList
  }

  getSolo = () => {
    if (!this.soloList) {
      this.soloList = this.getLead().filter(item => item.artists.length === 1);
    }
    return this.soloList
  }

  getFeatured = () => {
    if (!this.featuredList) {
      this.featuredList = this.getAll().filter(item => item.artists.length > 1 && !this.containsMainArtist(item.artists))
    }
    return this.featuredList
  }

  getVideos = () => {
    if (!this.videoList) {
      this.videoList = this.getAll().filter(item => this.includeStr(item.mediaType, 'VIDEO'))
    }
    return this.videoList
  }

  getPlayCountsByAllType() {
    return {
      // total
      total: this.getTotalStreams(this.getAll()),
      // lead
      lead: this.getTotalStreams(this.getLead()),
      // solo
      solo: this.getTotalStreams(this.getSolo()),
      // featured
      featured: this.getTotalStreams(this.getFeatured()),
      // standalone videos
      videos: this.getTotalStreams(this.getVideos()),
    }
  }

  getCurrMap() {
    return this.currMap;
  }

  getDuplicates(map: Map<number, string[]>): Set<string> {
    const arr: string[] = [];
    for (let [_, value] of map) {
      if (value.length > 1) {
        const [_, ...rest] = value;
        arr.push(...rest)
      }
    }

    return new Set(arr);
  }

  getTotalStreams(list: any[]): string {
    return String(list.reduce((total, item) => total + BigInt(item.playcount), BigInt(0)));
  }

  containsMainArtist(artists: any[]): boolean {
    const artistName = artists[0].profile.name;
    return !!artists.length && this.includeStr(artistName, 'Mariah Carey');
  }

  includeStr(value: string, search: string): boolean {
    return typeof value == "string" && value.indexOf(search) > -1
  }
}
