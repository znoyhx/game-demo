export type RouteId = 'home' | 'game' | 'debug' | 'review';

export interface RouteMeta {
  id: RouteId;
  path: string;
  label: string;
  summary: string;
}

export interface FeaturePanel {
  title: string;
  description: string;
  status: 'placeholder' | 'planned' | 'ready';
  points: string[];
  footer: string;
}

export interface ShellState {
  currentRoute: RouteMeta;
  developerToolsVisible: boolean;
  setCurrentRoute: (route: RouteMeta) => void;
  setDeveloperToolsVisible: (visible: boolean) => void;
  toggleDeveloperToolsVisible: () => void;
}

export interface SchemaStub {
  name: string;
  owner: 'world' | 'area' | 'quest' | 'npc' | 'combat' | 'event' | 'save';
  status: 'planned';
}
