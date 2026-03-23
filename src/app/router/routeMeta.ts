import type { RouteMeta } from '../../core/types/appShell';

export const routeMeta: RouteMeta[] = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    summary: 'Competition-first entry for the PixelForge Agent vertical slice.',
  },
  {
    id: 'game',
    path: '/game',
    label: 'Game',
    summary: 'Main playable shell for area, NPC, quest, and combat modules.',
  },
  {
    id: 'debug',
    path: '/debug',
    label: 'Debug',
    summary: 'Fast-path controls for deterministic scenario testing and inspection.',
  },
  {
    id: 'review',
    path: '/review',
    label: 'Review',
    summary: 'Post-run explanation and review route for visible AI behavior.',
  },
];

export function findRouteMeta(pathname: string): RouteMeta {
  return routeMeta.find((entry) => entry.path === pathname) ?? routeMeta[0];
}
