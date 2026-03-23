import { describe, expect, it } from 'vitest';

import { StartupController } from '../../src/core/controllers/startupController';
import type { StorageAdapter } from '../../src/core/persistence/storageAdapter';
import {
  createGameStore,
  selectCurrentAreaId,
  selectLastLoadState,
  selectSaveMetadata,
  selectStartupReason,
  selectStartupSource,
  selectWorldFlags,
} from '../../src/core/state';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';

class StubStorageAdapter implements StorageAdapter {
  constructor(
    private readonly latestSave: unknown | null,
    private readonly shouldThrow = false,
  ) {}

  async listSaves() {
    return [];
  }

  async getLatestSave(): Promise<unknown | null> {
    if (this.shouldThrow) {
      throw new Error('storage failure');
    }

    return this.latestSave;
  }

  async writeSave() {}

  async clearLatestSave() {}
}

describe('startup controller', () => {
  it('loads and hydrates the latest valid save when one exists', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const savedSnapshot = {
      ...mockSaveSnapshot,
      metadata: {
        ...mockSaveSnapshot.metadata,
        id: 'save:restored-slot',
        updatedAt: '2026-03-23T00:55:00.000Z',
      },
      player: {
        ...mockSaveSnapshot.player,
        currentAreaId: mockIds.areas.sanctum,
      },
      world: {
        ...mockSaveSnapshot.world,
        flags: {
          ...mockSaveSnapshot.world.flags,
          sanctumSealBroken: true,
        },
      },
    };

    const controller = new StartupController({
      storageAdapter: new StubStorageAdapter(savedSnapshot),
      store,
    });

    const result = await controller.initialize();
    const state = store.getState();

    expect(result.source).toBe('save');
    expect(result.reason).toBe('save-restored');
    expect(selectStartupSource(state)).toBe('save');
    expect(selectStartupReason(state)).toBe('save-restored');
    expect(selectSaveMetadata(state).id).toBe('save:restored-slot');
    expect(selectCurrentAreaId(state)).toBe(mockIds.areas.sanctum);
    expect(selectWorldFlags(state).sanctumSealBroken).toBe(true);
    expect(selectLastLoadState(state)).toEqual({ ok: true });
  });

  it('falls back to the default mock world when no save exists', async () => {
    const store = createGameStore(mockSaveSnapshot);

    store.getState().setWorldFlag('sanctumSealBroken', true);

    const controller = new StartupController({
      storageAdapter: new StubStorageAdapter(null),
      store,
    });

    const result = await controller.initialize();
    const state = store.getState();

    expect(result.source).toBe('mock');
    expect(result.reason).toBe('no-save');
    expect(selectStartupSource(state)).toBe('mock');
    expect(selectStartupReason(state)).toBe('no-save');
    expect(selectSaveMetadata(state).id).toBe(mockSaveSnapshot.metadata.id);
    expect(selectCurrentAreaId(state)).toBe(mockSaveSnapshot.player.currentAreaId);
    expect(selectWorldFlags(state).sanctumSealBroken).toBe(false);
    expect(selectLastLoadState(state)).toEqual({ ok: false, reason: 'missing' });
  });

  it('falls back safely when the stored save is invalid', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new StartupController({
      storageAdapter: new StubStorageAdapter({
        metadata: {
          id: 'save:bad',
        },
      }),
      store,
    });

    const result = await controller.initialize();
    const state = store.getState();

    expect(result.source).toBe('mock');
    expect(result.reason).toBe('invalid-save');
    expect(selectStartupSource(state)).toBe('mock');
    expect(selectStartupReason(state)).toBe('invalid-save');
    expect(selectSaveMetadata(state).id).toBe(mockSaveSnapshot.metadata.id);
    expect(selectLastLoadState(state)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('fails safely to the mock world when storage access throws', async () => {
    const store = createGameStore(mockSaveSnapshot);
    const controller = new StartupController({
      storageAdapter: new StubStorageAdapter(null, true),
      store,
    });

    const result = await controller.initialize();
    const state = store.getState();

    expect(result.source).toBe('mock');
    expect(result.reason).toBe('storage-error');
    expect(selectStartupSource(state)).toBe('mock');
    expect(selectStartupReason(state)).toBe('storage-error');
    expect(selectLastLoadState(state)).toEqual({ ok: false, reason: 'corrupt' });
  });
});
