import { create } from 'zustand';

import type { RouteMeta, ShellState } from '../types/appShell';

const defaultRoute: RouteMeta = {
  id: 'home',
  path: '/',
  label: 'Home',
  summary: 'Competition-first entry for the PixelForge Agent vertical slice.',
};

export const useShellStore = create<ShellState>((set) => ({
  currentRoute: defaultRoute,
  setCurrentRoute: (route) => set({ currentRoute: route }),
}));
