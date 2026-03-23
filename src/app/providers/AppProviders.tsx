import type { ReactNode } from 'react';

import { RouteStatusSync } from './RouteStatusSync';
import { StartupBootstrap } from './StartupBootstrap';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      <StartupBootstrap />
      <RouteStatusSync />
      {children}
    </>
  );
}
