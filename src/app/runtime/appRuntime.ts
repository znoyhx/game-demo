import { createMockAgentSet } from '../../core/agents';
import {
  AreaNavigationController,
  CombatController,
  EventTriggerController,
  NpcInteractionController,
  PlayerModelController,
  QuestProgressionController,
  ReviewGenerationController,
  SaveLoadController,
  WorldCreationController,
} from '../../core/controllers';
import { gameEventBus, gameLogger } from '../../core/logging';
import { LocalStorageAdapter } from '../../core/persistence/storageAdapter';
import { gameStore } from '../../core/state';

export const appStorageAdapter = new LocalStorageAdapter();
export const appAgents = createMockAgentSet();

export const appSaveLoadController = new SaveLoadController({
  storageAdapter: appStorageAdapter,
  store: gameStore,
  eventBus: gameEventBus,
});

export const appQuestProgressionController = new QuestProgressionController({
  store: gameStore,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
});

export const appReviewGenerationController = new ReviewGenerationController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  logger: gameLogger,
});

export const appPlayerModelController = new PlayerModelController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  logger: gameLogger,
});

export const appAreaNavigationController = new AreaNavigationController({
  store: gameStore,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
});

export const appNpcInteractionController = new NpcInteractionController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  questController: appQuestProgressionController,
  logger: gameLogger,
});

export const appEventTriggerController = new EventTriggerController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  questController: appQuestProgressionController,
  logger: gameLogger,
});

export const appCombatController = new CombatController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  reviewController: appReviewGenerationController,
  logger: gameLogger,
});

export const appWorldCreationController = new WorldCreationController({
  store: gameStore,
  agents: appAgents,
  saveController: appSaveLoadController,
  logger: gameLogger,
});
