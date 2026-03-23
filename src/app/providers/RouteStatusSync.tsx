import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { findRouteMeta } from '../router/routeMeta';
import { useShellStore } from '../../core/state/shellStore';

export function RouteStatusSync() {
  const location = useLocation();
  const setCurrentRoute = useShellStore((state) => state.setCurrentRoute);

  useEffect(() => {
    setCurrentRoute(findRouteMeta(location.pathname));
  }, [location.pathname, setCurrentRoute]);

  return null;
}
