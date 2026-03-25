import { describe, expect, it } from 'vitest';

import {
  selectAppSessionState,
  createGameStore,
  selectActiveQuestProgress,
  selectCombatEncounters,
  selectCombatState,
  selectCurrentArea,
  selectCurrentAreaId,
  selectEventDirector,
  selectGameConfig,
  selectMapState,
  selectPlayerState,
  selectPlayerModelState,
  selectResourceState,
  selectReviewState,
  selectSaveMetadata,
  selectSaveStatus,
  selectUiState,
  selectWorldFlags,
} from '../../src/core/state';
import {
  mockBossCombatState,
  mockIds,
  mockQuestProgress,
  mockSaveSnapshot,
  mockSessionSnapshot,
} from '../../src/core/mocks/mvp';
import { saveSnapshotSchema, sessionSnapshotSchema } from '../../src/core/schemas';
import type { SaveSnapshot } from '../../src/core/schemas';

describe('game store', () => {
  it('initializes from the default mock save snapshot', () => {
    const store = createGameStore();
    const state = store.getState();

    expect(selectSaveMetadata(state).id).toBe(mockSaveSnapshot.metadata.id);
    expect(selectCurrentAreaId(state)).toBe(mockSaveSnapshot.player.currentAreaId);
    expect(selectCurrentArea(state)?.id).toBe(mockSaveSnapshot.player.currentAreaId);
    expect(selectPlayerState(state).gold).toBe(mockSaveSnapshot.player.gold);
    expect(selectMapState(state).unlockedAreaIds).toEqual(mockSaveSnapshot.map?.unlockedAreaIds);
    expect(selectPlayerModelState(state).tags).toEqual(mockSaveSnapshot.playerModel?.tags);
    expect(selectEventDirector(state)).toEqual(mockSaveSnapshot.events.director);
    expect(selectCombatEncounters(state)).toHaveLength(
      mockSaveSnapshot.combatSystem?.encounters.length ?? 0,
    );
    expect(selectReviewState(state)).toEqual(mockSaveSnapshot.reviewState);
    expect(selectGameConfig(state)).toEqual(mockSaveSnapshot.config);
    expect(selectResourceState(state)).toEqual(mockSaveSnapshot.resources);
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
      playerModel: {
        ...mockSaveSnapshot.playerModel!,
        tags: ['combat', 'risky'],
      },
      map: {
        ...mockSaveSnapshot.map!,
        currentAreaId: mockIds.areas.sanctum,
        unlockedAreaIds: [...mockSaveSnapshot.map!.unlockedAreaIds, mockIds.areas.sanctum],
      },
      combatSystem: {
        ...mockSaveSnapshot.combatSystem!,
        active: mockBossCombatState,
      },
      combat: mockBossCombatState,
      reviewState: {
        ...mockSaveSnapshot.reviewState!,
        current: {
          ...mockSaveSnapshot.reviewState!.current!,
          suggestions: ['Use guard breaks before committing to direct bursts.'],
        },
      },
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
    expect(selectPlayerModelState(state).tags).toEqual(['combat', 'risky']);
    expect(selectMapState(state).currentAreaId).toBe(mockIds.areas.sanctum);
    expect(selectReviewState(state).current?.suggestions[0]).toContain('guard breaks');
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
    store.getState().setPlayerModelTags(['combat', 'risky']);
    store.getState().patchGameConfig({
      presentationModeEnabled: true,
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
    expect(exportedSnapshot.map?.currentAreaId).toBe(mockIds.areas.sanctum);
    expect(exportedSnapshot.playerModel?.tags).toEqual(['combat', 'risky']);
    expect(exportedSnapshot.config?.presentationModeEnabled).toBe(true);
    expect(exportedSnapshot.events.history[exportedSnapshot.events.history.length - 1]?.eventId).toBe(
      mockIds.events.wardenCountermeasure,
    );
    expect(exportedSnapshot.quests.progress[0]?.currentObjectiveIndex).toBe(2);
    expect(selectSaveStatus(store.getState())).toBe('dirty');
  });

  it('hydrates and exports ui, debug, and app-session state separately from save state', () => {
    const store = createGameStore(mockSaveSnapshot);

    store.getState().hydrateFromSessionSnapshot(mockSessionSnapshot);

    expect(selectUiState(store.getState())).toEqual(mockSessionSnapshot.ui);
    expect(selectAppSessionState(store.getState())).toEqual(mockSessionSnapshot.session);

    store.getState().setSelectedAreaId(mockIds.areas.sanctum);
    store.getState().patchDebugToolsState({
      forcedEncounterId: mockIds.encounter,
      forcedTactic: 'counter',
      forcedPhaseId: 'phase:embers-unbound',
      simulatedPlayerPattern: 'analysis-first',
      combatSeed: 11,
    });
    store.getState().appendRouteHistory('review');

    const exportedSessionSnapshot = store.getState().exportSessionSnapshot();

    expect(sessionSnapshotSchema.safeParse(exportedSessionSnapshot).success).toBe(true);
    expect(exportedSessionSnapshot.ui.selectedAreaId).toBe(mockIds.areas.sanctum);
    expect(exportedSessionSnapshot.debug.forcedEncounterId).toBe(mockIds.encounter);
    expect(exportedSessionSnapshot.debug.forcedTactic).toBe('counter');
    expect(exportedSessionSnapshot.debug.forcedPhaseId).toBe(
      'phase:embers-unbound',
    );
    expect(exportedSessionSnapshot.debug.simulatedPlayerPattern).toBe(
      'analysis-first',
    );
    expect(exportedSessionSnapshot.debug.combatSeed).toBe(11);
    expect(
      exportedSessionSnapshot.session.routeHistory[
        exportedSessionSnapshot.session.routeHistory.length - 1
      ],
    ).toBe('review');
    expect(selectSaveStatus(store.getState())).toBe('hydrated');
  });
});
