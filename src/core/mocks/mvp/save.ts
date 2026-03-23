import type { SaveSnapshot } from '../../schemas';

import { mockAreas } from './areas';
import { mockIds, mockTimeline, MOCK_SCHEMA_VERSION } from './constants';
import { mockEventHistory, mockWorldEvents } from './events';
import { mockNpcDefinitions, mockNpcStates } from './npcs';
import { mockPlayerState } from './player';
import { mockQuestDefinitions, mockQuestProgress } from './quests';
import { mockWorld } from './world';

export const mockSaveSnapshot: SaveSnapshot = {
  metadata: {
    id: mockIds.save,
    version: MOCK_SCHEMA_VERSION,
    slot: 'slot-1',
    label: 'Emberfall archive checkpoint',
    createdAt: mockTimeline.saveCreatedAt,
    updatedAt: mockTimeline.saveUpdatedAt,
    source: 'auto',
  },
  world: mockWorld,
  areas: mockAreas,
  quests: {
    definitions: mockQuestDefinitions,
    progress: mockQuestProgress,
  },
  npcs: {
    definitions: mockNpcDefinitions,
    runtime: mockNpcStates,
  },
  player: mockPlayerState,
  events: {
    definitions: mockWorldEvents,
    history: mockEventHistory,
  },
  combat: null,
  review: null,
};
