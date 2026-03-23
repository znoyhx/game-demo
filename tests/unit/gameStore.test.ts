import { describe, expect, it } from 'vitest';

import {
  createGameStore,
  selectActiveQuestProgress,
  selectCombatState,
  selectCurrentArea,
  selectCurrentAreaId,
  selectPlayerState,
  selectSaveMetadata,
  selectSaveStatus,
  selectWorldFlags,
} from '../../src/core/state';
import { mockBossCombatState, mockIds, mockQuestProgress, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { saveSnapshotSchema } from '../../src/core/schemas';
import type { SaveSnapshot } from '../../src/core/schemas';

describe('game store', () => {
  it('initializes from the default mock save snapshot', () => {
    const store = createGameStore();
    const state = store.getState();

    expect(selectSaveMetadata(state).id).toBe(mockSaveSnapshot.metadata.id);
    expect(selectCurrentAreaId(state)).toBe(mockSaveSnapshot.player.currentAreaId);
    expect(selectCurrentArea(state)?.id).toBe(mockSaveSnapshot.player.currentAreaId);
    expect(selectPlayerState(state).gold).toBe(mockSaveSnapshot.player.gold);
    expect(selectSaveStatus(state)).toBe('hydrated');
  });

  it('hydrates all slices from a provided save snapshot', () => {
    const store = createGameStore();
    const hydratedSnapshot: SaveSnapshot = {
      ...mockSaveSnapshot,
      metadata: {
        ...mockSaveSnapshot.metadata,
        id: 'save:hydrated-slot',
        label: 'Hydrated state',
        updatedAt: '2026-03-23T00:40:00.000Z',
      },
      world: {
        ...mockSaveSnapshot.world,
        flags: {
          ...mockSaveSnapshot.world.flags,
          sanctumSealBroken: true,
        },
      },
      player: {
        ...mockSaveSnapshot.player,
        currentAreaId: mockIds.areas.sanctum,
        gold: 77,
      },
      combat: mockBossCombatState,
      quests: {
        ...mockSaveSnapshot.quests,
        progress: mockQuestProgress.map((progress) =>
          progress.questId === mockIds.quests.sidePatrol
            ? {
                ...progress,
                status: 'active',
                updatedAt: '2026-03-23T00:39:00.000Z',
              }
            : progress,
        ),
      },
    };

    store.getState().hydrateFromSnapshot(hydratedSnapshot);

    const state = store.getState();
    expect(selectSaveMetadata(state).id).toBe('save:hydrated-slot');
    expect(selectCurrentAreaId(state)).toBe(mockIds.areas.sanctum);
    expect(selectCurrentArea(state)?.id).toBe(mockIds.areas.sanctum);
    expect(selectPlayerState(state).gold).toBe(77);
    expect(selectCombatState(state)).toEqual(mockBossCombatState);
    expect(selectWorldFlags(state).sanctumSealBroken).toBe(true);
    expect(selectActiveQuestProgress(state).map((entry) => entry.questId)).toContain(mockIds.quests.sidePatrol);
  });

  it('exports a valid save snapshot from the current in-memory state', () => {
    const store = createGameStore(mockSaveSnapshot);

    store.getState().setCurrentAreaId(mockIds.areas.sanctum);
    store.getState().setWorldFlag('sanctumSealBroken', true);
    store.getState().appendEventHistory({
      eventId: mockIds.events.wardenCountermeasure,
      triggeredAt: '2026-03-23T00:41:00.000Z',
      source: 'playerModel',
    });
    store.getState().upsertQuestProgress({
      ...mockQuestProgress[0],
      currentObjectiveIndex: 2,
      completedObjectiveIds: [
        'objective:main-brief-lyra',
        'objective:main-recover-relay-core',
      ],
      updatedAt: '2026-03-23T00:41:00.000Z',
    });

    const exportedSnapshot = store.getState().exportSaveSnapshot({
      updatedAt: '2026-03-23T00:42:00.000Z',
    });

    expect(saveSnapshotSchema.safeParse(exportedSnapshot).success).toBe(true);
    expect(exportedSnapshot.player.currentAreaId).toBe(mockIds.areas.sanctum);
    expect(exportedSnapshot.world.flags.sanctumSealBroken).toBe(true);
    expect(exportedSnapshot.metadata.updatedAt).toBe('2026-03-23T00:42:00.000Z');
    expect(exportedSnapshot.events.history[exportedSnapshot.events.history.length - 1]?.eventId).toBe(
      mockIds.events.wardenCountermeasure,
    );
    expect(exportedSnapshot.quests.progress[0]?.currentObjectiveIndex).toBe(2);
    expect(selectSaveStatus(store.getState())).toBe('dirty');
  });
});
