import type { GameConfigState, ResourceState } from '../../schemas';

import { mockIds } from './constants';

export const mockGameConfig: GameConfigState = {
  theme: '灰烬前线',
  worldStyle: '像素奇幻边境',
  difficulty: 'normal',
  gameGoal: '在灰烬守卫的进攻下重燃守护结界，并让烬陨镇继续坚持下去。',
  learningGoal: '读取世界状态、应对战术变化，并理解可解释 AI 决策。',
  storyPremise:
    '烬陨镇是一座正在衰败的守护边镇，封印中的圣所正滑向崩毁，迫使下一任游侠必须在山谷燃尽前守住三个区域。',
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
      label: '烬陨镇地表瓦片集',
      source: 'assets/tilesets/emberfall.png',
    },
    {
      id: 'resource:bg-crossroads',
      kind: 'background',
      key: 'bg-crossroads',
      label: '余烬前哨背景',
      areaId: mockIds.areas.crossroads,
      source: 'assets/backgrounds/crossroads.png',
    },
    {
      id: 'resource:bg-archive',
      kind: 'background',
      key: 'bg-archive',
      label: '沉没秘库背景',
      areaId: mockIds.areas.archive,
      source: 'assets/backgrounds/archive.png',
    },
    {
      id: 'resource:bg-sanctum',
      kind: 'background',
      key: 'bg-sanctum',
      label: '余烬圣所背景',
      areaId: mockIds.areas.sanctum,
      source: 'assets/backgrounds/sanctum.png',
    },
    {
      id: 'resource:music-archive',
      kind: 'music',
      key: 'music-archive-whispers',
      label: '秘库低语',
      areaId: mockIds.areas.archive,
      source: 'assets/music/archive-whispers.ogg',
    },
    {
      id: 'resource:avatar-lyra',
      kind: 'avatar',
      key: 'avatar-lyra',
      label: '莱拉头像',
      npcId: mockIds.npcs.lyra,
      source: 'assets/avatars/lyra.png',
    },
    {
      id: 'resource:avatar-ash-warden',
      kind: 'avatar',
      key: 'avatar-ash-warden',
      label: '灰烬守卫头像',
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
