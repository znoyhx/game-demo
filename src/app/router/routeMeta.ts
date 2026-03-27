import type { RouteMeta } from '../../core/types/appShell';
import { locale } from '../../core/utils/locale';

export const routeMeta: RouteMeta[] = [
  {
    id: 'home',
    path: '/',
    ...locale.routes.home,
  },
  {
    id: 'game',
    path: '/game',
    ...locale.routes.game,
  },
  {
    id: 'debug',
    path: '/debug',
    ...locale.routes.debug,
  },
  {
    id: 'review',
    path: '/review',
    ...locale.routes.review,
  },
];

export const primaryRouteMeta = routeMeta.filter((entry) => entry.id !== 'debug');

export function findRouteMeta(pathname: string): RouteMeta {
  return routeMeta.find((entry) => entry.path === pathname) ?? routeMeta[0];
}
