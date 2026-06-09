import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'tracks',
        loadComponent: () => import('./tracks/tracks').then((c) => c.Tracks),
        title: 'Tracks',
    },
    {
        path: 'albums',
        loadComponent: () => import('./albums/albums').then((c) => c.Albums),
        title: 'Albums',
    },
        {
        path: 'test',
        loadComponent: () => import('./test/test').then((c) => c.Test),
        title: 'Albums',
    },
    { path: '', redirectTo: 'tracks', pathMatch: 'full' },
    { path: '**', redirectTo: 'tracks' },
];
