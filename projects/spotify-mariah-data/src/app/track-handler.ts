import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of, take, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TrackHandler {


  private currMap: Map<string, any> | null = null;

  private prevMap: Map<string, any> | null = null;

  private countIdMap = new Map<number, string[]>();

  private allList: any[] | null = null;

  private leadList: any[] | null = null;

  private soloList: any[] | null = null;

  private featuredList: any[] | null = null;

  private videoList: any[] | null = null;

  private http = inject(HttpClient);

  loadTracks(): Observable<any> {
    if (this.currMap) {
      return of(true).pipe(take(1))
    }
    return forkJoin({
      curr: this.http.get<any[]>("2026-06-10.json"),
      prev: this.http.get<any[]>("2026-06-09.json")
    }).pipe(
      tap(({ curr, prev }) => this.processDailyChanges(curr, prev))
    )
  }

  processDailyChanges(curr: any[], prev: any[]): void {
    // all today's tracks including duplicated stream counts
    const currMap = this.processTrackList(curr)

    // all yesterday's tracks including duplicated stream counts
    this.prevMap = this.processTrackList(prev)

    for (let [key, value] of currMap) {
      const prevDay = this.prevMap.get(key);
      currMap.set(key, { ...value, prevcount: prevDay ? prevDay.playcount : 0 })
    }

    this.currMap = new Map(currMap);
  }

  processTrackList(list: any[]): Map<string, any> {
    const map = new Map<string, any>();
    list.forEach((el) => {
      const content = el.data.playlistV2?.content;
      if (content?.items) {
        content.items.forEach((item: any) => {
          if (item?.uid && !map.has(item.uid)) {
            const { uid, itemV2 } = item;
            map.set(item.uid, {
              uid,
              name: itemV2?.data?.name,
              playcount: itemV2?.data?.playcount || 0,
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
    }
    )
    return map;
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

  getPrevMap() {
    return this.prevMap;
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
