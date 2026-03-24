import type { PlayerModelState, PlayerState } from '../../schemas';

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
    '玩家通常会先把可选路线摸清，再推进关键主线。',
    '玩家倾向先尝试对话，但受阻后会迅速转向高压战斗手段。',
  ],
  recentAreaVisits: [mockIds.areas.crossroads, mockIds.areas.archive, mockIds.areas.sanctum],
  recentQuestChoices: ['branch:main-trust-rowan'],
  npcInteractionCount: 4,
  dominantStyle: 'story',
  riskForecast: '一旦圣所路线开启，玩家大概率会选择继续强推。',
  stuckPoint: '只有当罗文的信任跌破支援阈值时，玩家才会明显犹豫。',
  lastUpdatedAt: mockTimeline.playerModelUpdatedAt,
};
