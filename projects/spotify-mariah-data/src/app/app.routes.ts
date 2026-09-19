import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'test',
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
        path: '',
        loadComponent: () => import('ui').then((c) => c.Shell),
        children: [
            {
                path: 'overview',
                loadComponent: () => import('ui').then((c) => c.Overview),
                title: 'Overview – Mariah Carey Streams',
            },
            // {
            //     path: 'charts',
            //     children: [
            //         {
            //             path: 'songs',
            //             loadComponent: () => import('ui').then((c) => c.SpotifyCharts),
            //             data: { chartType: 'songs' },
            //             title: 'Song Charts – Mariah Carey',
            //         },
            //         {
            //             path: 'artists',
            //             loadComponent: () => import('ui').then((c) => c.SpotifyCharts),
            //             data: { chartType: 'artists' },
            //             title: 'Artist Charts – Mariah Carey',
            //         },
            //     ],
            // },
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
            {
                path: 'ytd',
                loadComponent: () => import('ui').then((c) => c.Ytd),
                children: [
                    {
                        path: 'tracks',
                        loadComponent: () => import('ui').then((c) => c.YtdTracks),
                        title: 'YTD Tracks – Mariah Carey Streams',
                    },
                    {
                        path: 'albums',
                        loadComponent: () => import('ui').then((c) => c.YtdAlbums),
                        title: 'YTD Albums – Mariah Carey Streams',
                    },
                    { path: '', redirectTo: 'tracks', pathMatch: 'full' },
                ],
            },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ]
    },
    { path: '', redirectTo: '', pathMatch: 'full' },
    { path: '**', redirectTo: '' },
];

