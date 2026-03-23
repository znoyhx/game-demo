import { createMockAgentSet } from '../../core/agents';
import { SaveLoadController, WorldCreationController } from '../../core/controllers';
import { gameEventBus, gameLogger } from '../../core/logging';
import { LocalStorageAdapter } from '../../core/persistence/storageAdapter';
import { gameStore } from '../../core/state';

export const appStorageAdapter = new LocalStorageAdapter();

export const appSaveLoadController = new SaveLoadController({
  storageAdapter: appStorageAdapter,
  store: gameStore,
  eventBus: gameEventBus,
});

export const appWorldCreationController = new WorldCreationController({
  store: gameStore,
  agents: createMockAgentSet(),
  saveController: appSaveLoadController,
  logger: gameLogger,
});
