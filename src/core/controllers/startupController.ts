import type { StoreApi } from 'zustand/vanilla';

import type { GameEventBus } from '../events/domainEvents';
import { mockSaveSnapshot } from '../mocks';
import type { StorageAdapter } from '../persistence/storageAdapter';
import type { GameStoreState } from '../state';
import type { LoadFailureReason, SaveSnapshot } from '../schemas';
import {
  SchemaSaveValidator,
  VersionedSaveMigrator,
  type SaveMigrator,
  type SaveValidator,
} from '../rules';

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
  eventBus?: GameEventBus;
  saveValidator?: SaveValidator;
  saveMigrator?: SaveMigrator;
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

  private readonly eventBus?: GameEventBus;

  private readonly saveValidator: SaveValidator;

  private readonly saveMigrator: SaveMigrator;

  constructor({
    storageAdapter,
    store,
    fallbackSnapshot = mockSaveSnapshot,
    eventBus,
    saveValidator = new SchemaSaveValidator(),
    saveMigrator = new VersionedSaveMigrator(),
  }: StartupControllerOptions) {
    this.storageAdapter = storageAdapter;
    this.store = store;
    this.fallbackSnapshot = fallbackSnapshot;
    this.eventBus = eventBus;
    this.saveValidator = saveValidator;
    this.saveMigrator = saveMigrator;
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
        this.eventBus?.emit('WORLD_LOADED', {
          worldId: result.snapshot.world.summary.id,
          source: result.source,
          reason: result.reason,
          saveId: result.snapshot.metadata.id,
          loadFailureReason: 'missing',
        });

        return result;
      }

      const validatedSave = this.saveValidator.validate(rawSave);
      const parsedSave =
        validatedSave.ok && validatedSave.snapshot
          ? validatedSave
          : this.saveMigrator.migrate(rawSave);

      if (!parsedSave.ok || !parsedSave.snapshot) {
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
        this.eventBus?.emit('WORLD_LOADED', {
          worldId: result.snapshot.world.summary.id,
          source: result.source,
          reason: result.reason,
          saveId: result.snapshot.metadata.id,
          loadFailureReason: 'invalid',
        });

        return result;
      }

      applyStartupState(this.store, parsedSave.snapshot, 'save', 'save-restored');

      const result: StartupResult = {
        snapshot: parsedSave.snapshot,
        source: 'save',
        reason: 'save-restored',
      };

      logStartupResult(result);
      this.eventBus?.emit('WORLD_LOADED', {
        worldId: result.snapshot.world.summary.id,
        source: result.source,
        reason: result.reason,
        saveId: result.snapshot.metadata.id,
      });
      this.eventBus?.emit('SAVE_RESTORED', {
        saveId: result.snapshot.metadata.id,
        updatedAt: result.snapshot.metadata.updatedAt,
      });

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
      this.eventBus?.emit('WORLD_LOADED', {
        worldId: result.snapshot.world.summary.id,
        source: result.source,
        reason: result.reason,
        saveId: result.snapshot.metadata.id,
        loadFailureReason: 'corrupt',
      });

      return result;
    }
  }
}
