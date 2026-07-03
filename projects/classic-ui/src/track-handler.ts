import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, take, tap } from 'rxjs';

const GET_DATA_URL = 'https://raw.githubusercontent.com/iresa-org/spotify-mariah-data/refs/heads/data/result/current.json'

@Injectable({
  providedIn: 'root',
})
export class TrackHandler {

  private trackListResp: Record<string, any> | null = null

  private currMap = new Map<string, any>;

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
    return this.http.get(GET_DATA_URL, { params }).pipe(
      tap((data) => this.processTrackList(data))
    )
  }

  processTrackList(resp: Record<string, any>) {
    this.trackListResp = resp;

    resp['tracks'].forEach((item: any) => {
      const { trackDetails, dailyChanges, categories, countMerged } = item;
      const { uid, itemV2 } = trackDetails;
      if (uid && !this.currMap.has(uid)) {
        this.currMap.set(uid, {
          uid,
          name: itemV2?.data?.name,
          playcount: dailyChanges.playCount,
          change: dailyChanges.change,
          percent: dailyChanges.percentChange,
          artists: itemV2?.data?.artists.items,
          album: itemV2?.data.albumOfTrack,
          discNumber: itemV2?.data?.discNumber,
          trackNumber: itemV2?.data?.trackNumber,
          associationsV3: itemV2?.data?.associationsV3,
          isVideo: categories.includes('V'),
          categories,
          countMerged
        });
      }
    });
  }

  getAll = () => {
    if (!this.allList) {
      this.allList = Array.from(this.currMap!.values()).filter(item => !item.countMerged);
    }
    return this.allList
  }

  getLead = () => {
    if (!this.leadList) {
      this.leadList = Array.from(this.getAll()).filter(item => item.categories.includes('L'));
    }
    return this.leadList
  }

  getSolo = () => {
    if (!this.soloList) {
      this.soloList = Array.from(this.getLead()).filter(item => item.categories.includes('S'));
    }
    return this.soloList
  }

  getFeatured = () => {
    if (!this.featuredList) {
      this.featuredList = Array.from(this.getAll()).filter(item => item.categories.includes('F'));
    }
    return this.featuredList
  }

  getVideos = () => {
    if (!this.videoList) {
      this.videoList = Array.from(this.getAll()).filter(item => item.categories.includes('V'));
    }
    return this.videoList
  }

  getAlbums = () => {
    const albums: any[] = this.trackListResp?.['albums'];
    return albums.map(album => ({ ...album, albumDetails: { ...album.albumDetails, tracks: album.albumDetails.tracks.map((track: string) => this.currMap.get(track)) } }))
  }

  getPlayCountsByAllType() {
    return this.trackListResp?.['playCounts'];
  }

  getCurrMap() {
    return this.currMap;
  }

  getLastUpdated() {
    return this.trackListResp?.['lastUpdate']
  }

  includeStr(value: string, search: string): boolean {
    return typeof value == "string" && value.indexOf(search) > -1
  }
}
