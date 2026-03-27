import { create } from 'zustand';

import { routeMeta } from '../../app/router/routeMeta';
import type { RouteMeta, ShellState } from '../types/appShell';
import { locale } from '../utils/locale';

const defaultRoute: RouteMeta = routeMeta[0] ?? {
  id: 'home',
  path: '/',
  ...locale.routes.home,
};

export const useShellStore = create<ShellState>((set) => ({
  currentRoute: defaultRoute,
  developerToolsVisible: false,
  setCurrentRoute: (route) => set({ currentRoute: route }),
  setDeveloperToolsVisible: (visible) => set({ developerToolsVisible: visible }),
  toggleDeveloperToolsVisible: () =>
    set((state) => ({ developerToolsVisible: !state.developerToolsVisible })),
}));
