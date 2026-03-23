import type { PlayerState } from '../../schemas';

import { mockIds } from './constants';

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
