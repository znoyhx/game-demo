import type { GameConfigState, ResourceState } from '../../schemas';

import { mockIds } from './constants';

export const mockGameConfig: GameConfigState = {
  theme: 'cinder frontier',
  worldStyle: 'pixel fantasy frontier',
  difficulty: 'normal',
  gameGoal: 'Rekindle the ward and keep Emberfall playable through the Ash Warden assault.',
  learningGoal: 'Read the world state, react to tactics, and understand explainable AI decisions.',
  preferredMode: 'hybrid',
  templateId: 'template:emberfall-demo',
  quickStartEnabled: true,
  devModeEnabled: true,
  autosaveEnabled: true,
  autoLoadEnabled: true,
  presentationModeEnabled: false,
};

export const mockResourceState: ResourceState = {
  activeTheme: mockGameConfig.theme,
  entries: [
    {
      id: 'resource:tileset-emberfall',
      kind: 'tileset',
      key: 'tileset-emberfall',
      label: 'Emberfall field tileset',
      source: 'assets/tilesets/emberfall.png',
    },
    {
      id: 'resource:bg-crossroads',
      kind: 'background',
      key: 'bg-crossroads',
      label: 'Cinder Crossroads backdrop',
      areaId: mockIds.areas.crossroads,
      source: 'assets/backgrounds/crossroads.png',
    },
    {
      id: 'resource:bg-archive',
      kind: 'background',
      key: 'bg-archive',
      label: 'Sunken Archive backdrop',
      areaId: mockIds.areas.archive,
      source: 'assets/backgrounds/archive.png',
    },
    {
      id: 'resource:bg-sanctum',
      kind: 'background',
      key: 'bg-sanctum',
      label: 'Ember Sanctum backdrop',
      areaId: mockIds.areas.sanctum,
      source: 'assets/backgrounds/sanctum.png',
    },
    {
      id: 'resource:music-archive',
      kind: 'music',
      key: 'music-archive-whispers',
      label: 'Archive Whispers',
      areaId: mockIds.areas.archive,
      source: 'assets/music/archive-whispers.ogg',
    },
    {
      id: 'resource:avatar-lyra',
      kind: 'avatar',
      key: 'avatar-lyra',
      label: 'Lyra portrait',
      npcId: mockIds.npcs.lyra,
      source: 'assets/avatars/lyra.png',
    },
    {
      id: 'resource:avatar-ash-warden',
      kind: 'avatar',
      key: 'avatar-ash-warden',
      label: 'Ash Warden portrait',
      npcId: mockIds.npcs.ashWarden,
      source: 'assets/avatars/ash-warden.png',
    },
  ],
  loadedResourceKeys: [
    'tileset-emberfall',
    'bg-archive',
    'music-archive-whispers',
    'avatar-lyra',
  ],
  selectedBackgroundKey: 'bg-archive',
  selectedTilesetKey: 'tileset-emberfall',
  selectedMusicKey: 'music-archive-whispers',
};
