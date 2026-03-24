import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import { SaveLoadController } from '../../src/core/controllers/saveLoadController';
import { StartupController } from '../../src/core/controllers/startupController';
import { WorldCreationController } from '../../src/core/controllers/worldCreationController';
import {
  defaultWorldCreationRequest,
  mockQuestDefinitions,
  mockSaveSnapshot,
} from '../../src/core/mocks';
import type { SaveSnapshot } from '../../src/core/schemas';
import { saveSnapshotSchema } from '../../src/core/schemas';
import type {
  SaveSlotSummary,
  StorageAdapter,
} from '../../src/core/persistence/storageAdapter';
import {
  createGameStore,
  selectAvailableSaveSlots,
  selectCurrentAreaId,
  selectGameConfig,
  selectRecoveryNotice,
  selectSaveMetadata,
  selectStartupReason,
  selectStartupSource,
  selectWorldSummary,
} from '../../src/core/state';

class MemoryStorageAdapter implements StorageAdapter {
  latestSave: SaveSnapshot | null = null;

  async listSaves(): Promise<SaveSlotSummary[]> {
    if (!this.latestSave) {
      return [];
    }

    return [
      {
        id: this.latestSave.metadata.id,
        label:
          this.latestSave.metadata.label ??
          this.latestSave.metadata.slot ??
          'Latest Save',
        updatedAt: this.latestSave.metadata.updatedAt,
      },
    ];
  }

  async getLatestSave(): Promise<unknown | null> {
    return this.latestSave;
  }

  async writeSave(snapshot: SaveSnapshot): Promise<void> {
    this.latestSave = snapshot;
  }

  async clearLatestSave(): Promise<void> {
    this.latestSave = null;
  }
}

class ThrowingSaveWriter {
  async saveNow() {
    throw new Error('save failed');
  }
}

const createHarness = (timestamp: string) => {
  const storageAdapter = new MemoryStorageAdapter();
  const store = createGameStore(mockSaveSnapshot);
  const saveController = new SaveLoadController({
    storageAdapter,
    store,
    now: () => timestamp,
  });
  const controller = new WorldCreationController({
    store,
    agents: createMockAgentSet(),
    saveController,
    now: () => timestamp,
  });

  return {
    storageAdapter,
    store,
    controller,
  };
};

describe('world creation controller', () => {
  it('builds, normalizes, hydrates, and creates the initial save for a generated world', async () => {
    const { controller, storageAdapter, store } = createHarness('2026-03-23T02:00:00.000Z');

    const result = await controller.createWorld({
      ...defaultWorldCreationRequest,
      theme: ' ember frontier ',
      worldStyle: ' pixel fantasy frontier ',
      gameGoal: ' stabilize the ward network before the last bastion falls ',
      learningGoal: ' inspect the normalized startup pipeline ',
    });

    const latestSave = saveSnapshotSchema.parse(storageAdapter.latestSave);
    const state = store.getState();

    expect(result.usedFallback).toBe(false);
    expect(result.outputs.mainQuestSeed).toBe(
      'Stabilize the ward network before the last bastion falls',
    );
    expect(saveSnapshotSchema.safeParse(result.snapshot).success).toBe(true);
    expect(result.outputs.worldName).toBe(result.snapshot.world.summary.name);
    expect(latestSave.world.summary.name).toBe(result.snapshot.world.summary.name);
    expect(latestSave.metadata.id).toBe(selectSaveMetadata(state).id);
    expect(latestSave.metadata.source).toBe('manual');
    expect(selectWorldSummary(state).name).toBe(result.outputs.worldName);
    expect(selectGameConfig(state).theme).toBe('ember frontier');
    expect(selectGameConfig(state).worldStyle).toBe('pixel fantasy frontier');
    expect(selectGameConfig(state).gameGoal).toBe(
      'stabilize the ward network before the last bastion falls',
    );
    expect(selectStartupSource(state)).toBe('generated');
    expect(selectStartupReason(state)).toBe('world-created');
    expect(selectCurrentAreaId(state)).toBe(result.snapshot.player.currentAreaId);
    expect(selectRecoveryNotice(state)).toBeNull();
    expect(selectAvailableSaveSlots(state)).toHaveLength(1);
    expect(state.areaOrder).toHaveLength(4);
    expect(result.snapshot.quests.definitions).toHaveLength(mockQuestDefinitions.length);
    expect(state.questDefinitionOrder).toHaveLength(mockQuestDefinitions.length);
    expect(state.npcDefinitionOrder).toHaveLength(5);
    expect(state.eventDefinitionOrder).toHaveLength(3);
    expect(state.combatEncounterOrder).toHaveLength(1);
    expect(state.resourceState.entries.length).toBeGreaterThan(0);
  });

  it('loads template-based worlds through the same hydration and save pipeline', async () => {
    const { controller, storageAdapter, store } = createHarness('2026-03-23T02:10:00.000Z');

    const result = await controller.createWorldFromTemplate('template:quick-play');
    const latestSave = saveSnapshotSchema.parse(storageAdapter.latestSave);
    const state = store.getState();

    expect(result.usedFallback).toBe(false);
    expect(result.snapshot.config?.templateId).toBe('template:quick-play');
    expect(result.snapshot.config?.quickStartEnabled).toBe(true);
    expect(result.snapshot.map?.unlockedAreaIds.length ?? 0).toBeGreaterThan(1);
    expect(selectStartupSource(state)).toBe('generated');
    expect(selectStartupReason(state)).toBe('world-created');
    expect(selectGameConfig(state).templateId).toBe('template:quick-play');
    expect(selectGameConfig(state).quickStartEnabled).toBe(true);
    expect(latestSave.metadata.id).toBe(selectSaveMetadata(state).id);
    expect(latestSave.metadata.source).toBe('manual');
  });

  it('creates a debug-tagged opening save that startup can restore into a fresh store', async () => {
    const { controller, storageAdapter } = createHarness('2026-03-23T02:20:00.000Z');

    const createdResult = await controller.createDevTestWorld();
    const createdSave = saveSnapshotSchema.parse(storageAdapter.latestSave);
    const restoredStore = createGameStore(mockSaveSnapshot);
    const startupController = new StartupController({
      storageAdapter,
      store: restoredStore,
    });

    const startupResult = await startupController.initialize();
    const restoredState = restoredStore.getState();

    expect(createdResult.snapshot.config?.devModeEnabled).toBe(true);
    expect(createdSave.metadata.source).toBe('debug');
    expect(startupResult.source).toBe('save');
    expect(startupResult.reason).toBe('save-restored');
    expect(selectStartupSource(restoredState)).toBe('save');
    expect(selectStartupReason(restoredState)).toBe('save-restored');
    expect(selectWorldSummary(restoredState).name).toBe(createdResult.outputs.worldName);
    expect(selectGameConfig(restoredState).devModeEnabled).toBe(true);
    expect(selectSaveMetadata(restoredState).id).toBe(createdSave.metadata.id);
  });

  it('falls back to a deterministic opening snapshot when generation fails and still creates an initial save', async () => {
    const storageAdapter = new MemoryStorageAdapter();
    const store = createGameStore(mockSaveSnapshot);
    const saveController = new SaveLoadController({
      storageAdapter,
      store,
      now: () => '2026-03-23T03:00:00.000Z',
    });
    const agents = createMockAgentSet();

    agents.worldArchitect = {
      ...agents.worldArchitect,
      run: async () => {
        throw new Error('world architect failed');
      },
    };

    const controller = new WorldCreationController({
      store,
      agents,
      saveController,
      now: () => '2026-03-23T03:00:00.000Z',
    });

    const result = await controller.createWorld(defaultWorldCreationRequest);
    const latestSave = saveSnapshotSchema.parse(storageAdapter.latestSave);

    expect(result.usedFallback).toBe(true);
    expect(result.fallbackReason).toBe('world-architect-failed');
    expect(result.snapshot.quests.definitions).toHaveLength(mockQuestDefinitions.length);
    expect(
      result.snapshot.quests.definitions.find((quest) => quest.type === 'main')?.title,
    ).toBe(defaultWorldCreationRequest.gameGoal.trim());
    expect(selectStartupSource(store.getState())).toBe('generated');
    expect(selectStartupReason(store.getState())).toBe('world-created');
    expect(selectRecoveryNotice(store.getState())).toBeTruthy();
    expect(latestSave.world.summary.name).toBe(result.snapshot.world.summary.name);
    expect(latestSave.metadata.source).toBe('manual');
  });

  it('surfaces save failures instead of masking them as generation fallback', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new WorldCreationController({
      store,
      agents: createMockAgentSet(),
      saveController: new ThrowingSaveWriter(),
      now: () => '2026-03-23T03:10:00.000Z',
    });

    await expect(controller.createWorld(defaultWorldCreationRequest)).rejects.toThrow(
      'save failed',
    );
    expect(selectWorldSummary(store.getState()).name).toBeTruthy();
    expect(selectRecoveryNotice(store.getState())).toBeNull();
  });
});
