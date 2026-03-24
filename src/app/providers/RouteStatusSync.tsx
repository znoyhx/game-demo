import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { findRouteMeta } from '../router/routeMeta';
import { useShellStore } from '../../core/state/shellStore';

export function RouteStatusSync() {
  const location = useLocation();
  const currentRoute = useShellStore((state) => state.currentRoute);
  const setCurrentRoute = useShellStore((state) => state.setCurrentRoute);

  useEffect(() => {
    if (currentRoute.path === location.pathname) {
      return;
    }

    setCurrentRoute(findRouteMeta(location.pathname));
  }, [currentRoute.path, location.pathname, setCurrentRoute]);

  return null;
}
