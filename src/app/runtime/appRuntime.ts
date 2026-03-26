import { createMockAgentSet } from '../../core/agents';
import {
  AreaDebugController,
  AreaNavigationController,
  CombatController,
  ConfigResourceDebugController,
  DebugScenarioController,
  EventDebugController,
  EventTriggerController,
  ExplorationEncounterController,
  NpcInteractionController,
  PlayerModelController,
  QuestDebugController,
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

export const appPlayerModelController = new PlayerModelController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  logger: gameLogger,
});

export const appReviewGenerationController = new ReviewGenerationController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  logger: gameLogger,
});

export const appQuestProgressionController = new QuestProgressionController({
  store: gameStore,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  playerModelController: appPlayerModelController,
  reviewController: appReviewGenerationController,
});

export const appQuestDebugController = new QuestDebugController({
  store: gameStore,
  questController: appQuestProgressionController,
  saveController: appSaveLoadController,
});

export const appEventTriggerController = new EventTriggerController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  questController: appQuestProgressionController,
  logger: gameLogger,
});

export const appEventDebugController = new EventDebugController({
  store: gameStore,
  eventController: appEventTriggerController,
  saveController: appSaveLoadController,
});

export const appNpcInteractionController = new NpcInteractionController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  questController: appQuestProgressionController,
  playerModelController: appPlayerModelController,
  reviewController: appReviewGenerationController,
  logger: gameLogger,
});

export const appCombatController = new CombatController({
  store: gameStore,
  agents: appAgents,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  reviewController: appReviewGenerationController,
  playerModelController: appPlayerModelController,
  logger: gameLogger,
});

export const appExplorationEncounterController = new ExplorationEncounterController({
  store: gameStore,
  saveController: appSaveLoadController,
  combatController: appCombatController,
  questController: appQuestProgressionController,
  playerModelController: appPlayerModelController,
});

export const appAreaNavigationController = new AreaNavigationController({
  store: gameStore,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  questController: appQuestProgressionController,
  playerModelController: appPlayerModelController,
  explorationController: appExplorationEncounterController,
  eventController: appEventTriggerController,
});

export const appAreaDebugController = new AreaDebugController({
  store: gameStore,
  eventBus: gameEventBus,
  saveController: appSaveLoadController,
  explorationController: appExplorationEncounterController,
});

export const appConfigResourceDebugController = new ConfigResourceDebugController({
  store: gameStore,
  saveController: appSaveLoadController,
});

export const appDebugScenarioController = new DebugScenarioController({
  store: gameStore,
  saveController: appSaveLoadController,
  areaDebugController: appAreaDebugController,
  areaController: appAreaNavigationController,
  questController: appQuestProgressionController,
  npcController: appNpcInteractionController,
  combatController: appCombatController,
  eventController: appEventTriggerController,
  playerModelController: appPlayerModelController,
  reviewController: appReviewGenerationController,
});

export const appWorldCreationController = new WorldCreationController({
  store: gameStore,
  agents: appAgents,
  saveController: appSaveLoadController,
  logger: gameLogger,
});
