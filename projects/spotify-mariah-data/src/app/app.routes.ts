import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'classic',
        loadComponent: () => import('classic-ui').then((c) => c.Shell),
        children: [
            {
                path: 'tracks',
                loadComponent: () => import('classic-ui').then((c) => c.Tracks),
                title: 'Tracks',
            },
            {
                path: 'albums',
                loadComponent: () => import('classic-ui').then((c) => c.Albums),
                title: 'Albums',
            },
            { path: '', redirectTo: 'tracks', pathMatch: 'full' },
        ]
    },
    {
        path: 'ui',
        loadComponent: () => import('ui').then((c) => c.Shell),
        children: [
            {
                path: 'overview',
                loadComponent: () => import('ui').then((c) => c.Overview),
                title: 'Overview – Mariah Carey Streams',
            },
            {
                path: 'tracks',
                loadComponent: () => import('ui').then((c) => c.Tracks),
                title: 'Tracks – Mariah Carey Streams',
            },
            {
                path: 'tracks/:uid',
                loadComponent: () => import('ui').then((c) => c.TrackDetail),
                title: 'Track Detail – Mariah Carey Streams',
            },
            {
                path: 'albums',
                loadComponent: () => import('ui').then((c) => c.Albums),
                title: 'Albums – Mariah Carey Streams',
            },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ]
    },
    { path: '', redirectTo: 'classic', pathMatch: 'full' },
    { path: '**', redirectTo: 'classic' },
];

