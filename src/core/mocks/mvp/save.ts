import type { SaveSnapshot } from '../../schemas';

import { mockGameConfig, mockResourceState } from './config';
import { mockAreas } from './areas';
import { mockBossEncounterDefinition, mockCombatHistory } from './combat';
import { mockIds, mockTimeline, MOCK_SCHEMA_VERSION } from './constants';
import { mockEventDirectorState, mockEventHistory, mockWorldEvents } from './events';
import { mockNpcDefinitions, mockNpcStates } from './npcs';
import { mockPlayerModelState, mockPlayerState } from './player';
import { mockQuestDefinitions, mockQuestHistory, mockQuestProgress } from './quests';
import { mockReviewPayload, mockReviewState } from './combat';
import { mockWorld } from './world';

export const mockSaveSnapshot: SaveSnapshot = {
  metadata: {
    id: mockIds.save,
    version: MOCK_SCHEMA_VERSION,
    slot: 'slot-1',
    label: '烬陨镇秘库存档点',
    createdAt: mockTimeline.saveCreatedAt,
    updatedAt: mockTimeline.saveUpdatedAt,
    source: 'auto',
  },
  world: mockWorld,
  areas: mockAreas,
  map: {
    currentAreaId: mockPlayerState.currentAreaId,
    discoveredAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
    unlockedAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
    visitHistory: [mockIds.areas.crossroads, mockIds.areas.archive],
  },
  quests: {
    definitions: mockQuestDefinitions,
    progress: mockQuestProgress,
    history: mockQuestHistory,
  },
  npcs: {
    definitions: mockNpcDefinitions,
    runtime: mockNpcStates,
  },
  player: mockPlayerState,
  playerModel: mockPlayerModelState,
  events: {
    definitions: mockWorldEvents,
    history: mockEventHistory,
    director: mockEventDirectorState,
  },
  combatSystem: {
    encounters: [mockBossEncounterDefinition],
    active: null,
    history: mockCombatHistory,
  },
  combat: null,
  config: mockGameConfig,
  resources: mockResourceState,
  review: mockReviewPayload,
  reviewState: mockReviewState,
  exploration: {
    signals: [],
    ruleStates: [],
    searchedInteractionIds: [],
    collectedResourceNodeIds: [],
  },
};
