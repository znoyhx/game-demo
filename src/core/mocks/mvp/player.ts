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
    'The player keeps uncovering optional routes before forcing the critical path.',
    'Dialogue-first choices still give way to bold combat pressure when blocked.',
  ],
  recentAreaVisits: [mockIds.areas.crossroads, mockIds.areas.archive, mockIds.areas.sanctum],
  recentQuestChoices: ['branch:main-trust-rowan'],
  npcInteractionCount: 4,
  dominantStyle: 'story',
  riskForecast: 'High chance of pressing forward once the sanctum opens.',
  stuckPoint: 'The player hesitates only when Rowan trust drops below the support threshold.',
  lastUpdatedAt: mockTimeline.playerModelUpdatedAt,
};
