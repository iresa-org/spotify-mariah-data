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
    { path: '', redirectTo: 'classic', pathMatch: 'full' },
    { path: '**', redirectTo: 'tracks' },
];
