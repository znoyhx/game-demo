import {
  createEmptyPlayerModelSignalWeights,
  type PlayerModelState,
  type PlayerState,
} from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockPlayerState: PlayerState = {
  hp: 26,
  maxHp: 30,
  energy: 8,
  gold: 42,
  inventory: [
    {
      itemId: 'item:cinder-tonic',
      quantity: 1,
    },
    {
      itemId: 'item:archive-pass',
      quantity: 1,
    },
    {
      itemId: 'item:relay-core-fragment',
      quantity: 1,
    },
  ],
  profileTags: ['exploration', 'story', 'risky'],
  currentAreaId: mockIds.areas.archive,
};

export const mockPlayerModelState: PlayerModelState = {
  tags: ['exploration', 'story', 'risky'],
  rationale: [
    '玩家近期持续切换区域并主动追查关键线索，表现出鲜明的探索倾向。',
    '玩家在重要节点上更愿意主动推进剧情与高风险分支，因此系统保留了冒险型判断。',
  ],
  recentAreaVisits: [
    mockIds.areas.crossroads,
    mockIds.areas.archive,
    mockIds.areas.sanctum,
  ],
  recentCombatActions: ['attack', 'special', 'guard'],
  recentNpcInteractionIntents: ['ask', 'quest', 'trade'],
  recentQuestChoices: ['branch:main-trust-rowan'],
  npcInteractionCount: 4,
  signalWeights: {
    ...createEmptyPlayerModelSignalWeights(),
    exploration: 4,
    story: 5,
    risky: 3,
    social: 2,
    combat: 2,
  },
  dominantStyle: 'story',
  riskForecast: '如果继续一味高压推进，后续更容易遭遇资源压制或针对性反制。',
  stuckPoint: '若主线暂时停住，优先去找关键角色复盘对话并补齐地图线索。',
  lastUpdatedAt: mockTimeline.playerModelUpdatedAt,
};
