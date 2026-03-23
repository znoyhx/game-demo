import type { StoreApi } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import type { StorageAdapter } from '../persistence/storageAdapter';
import { saveSnapshotSchema } from '../schemas';
import type { GameStoreState } from '../state';
import type { LoadFailureReason, SaveSnapshot } from '../schemas';

export type StartupSource = 'save' | 'mock';
export type StartupReason =
  | 'save-restored'
  | 'no-save'
  | 'invalid-save'
  | 'storage-error';

export interface StartupResult {
  snapshot: SaveSnapshot;
  source: StartupSource;
  reason: StartupReason;
}

interface StartupControllerOptions {
  storageAdapter: StorageAdapter;
  store: StoreApi<GameStoreState>;
  fallbackSnapshot?: SaveSnapshot;
}

const logStartupResult = (result: StartupResult) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const log =
    result.source === 'save' ? console.info.bind(console) : console.warn.bind(console);

  log('[startupController]', {
    source: result.source,
    reason: result.reason,
    saveId: result.snapshot.metadata.id,
  });
};

const applyStartupState = (
  store: StoreApi<GameStoreState>,
  snapshot: SaveSnapshot,
  source: StartupSource,
  reason: StartupReason,
  loadFailureReason?: LoadFailureReason,
) => {
  const state = store.getState();

  state.hydrateFromSnapshot(snapshot);
  state.setStartupState(source, reason);
  state.setLastLoadState(
    loadFailureReason
      ? {
          ok: false,
          reason: loadFailureReason,
        }
      : {
          ok: true,
        },
  );
};

export class StartupController {
  private readonly storageAdapter: StorageAdapter;

  private readonly store: StoreApi<GameStoreState>;

  private readonly fallbackSnapshot: SaveSnapshot;

  constructor({
    storageAdapter,
    store,
    fallbackSnapshot = mockSaveSnapshot,
  }: StartupControllerOptions) {
    this.storageAdapter = storageAdapter;
    this.store = store;
    this.fallbackSnapshot = fallbackSnapshot;
  }

  async initialize(): Promise<StartupResult> {
    try {
      const rawSave = await this.storageAdapter.getLatestSave();

      if (rawSave === null) {
        applyStartupState(
          this.store,
          this.fallbackSnapshot,
          'mock',
          'no-save',
          'missing',
        );

        const result: StartupResult = {
          snapshot: this.fallbackSnapshot,
          source: 'mock',
          reason: 'no-save',
        };

        logStartupResult(result);

        return result;
      }

      const parsedSave = saveSnapshotSchema.safeParse(rawSave);

      if (!parsedSave.success) {
        applyStartupState(
          this.store,
          this.fallbackSnapshot,
          'mock',
          'invalid-save',
          'invalid',
        );

        const result: StartupResult = {
          snapshot: this.fallbackSnapshot,
          source: 'mock',
          reason: 'invalid-save',
        };

        logStartupResult(result);

        return result;
      }

      applyStartupState(this.store, parsedSave.data, 'save', 'save-restored');

      const result: StartupResult = {
        snapshot: parsedSave.data,
        source: 'save',
        reason: 'save-restored',
      };

      logStartupResult(result);

      return result;
    } catch {
      applyStartupState(
        this.store,
        this.fallbackSnapshot,
        'mock',
        'storage-error',
        'corrupt',
      );

      const result: StartupResult = {
        snapshot: this.fallbackSnapshot,
        source: 'mock',
        reason: 'storage-error',
      };

      logStartupResult(result);

      return result;
    }
  }
}
