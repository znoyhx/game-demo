import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import { mockBossEncounterDefinition, mockNpcDefinitions, mockNpcStates } from '../mocks';
import type { GameLogger } from '../logging';
import type {
  GameConfigState,
  PlayerModelState,
  PlayerProfileTag,
  PlayerState,
  QuestHistoryEntry,
  QuestProgress,
  ReviewState,
  SaveSnapshot,
  WorldArchitectInput,
} from '../schemas';
import type { GameStoreState } from '../state';

import { evaluateQuestAvailability } from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';

const uniqueIds = (values: string[]) => Array.from(new Set(values));

const derivePlayerTags = (
  preferredMode: WorldArchitectInput['preferredMode'],
): PlayerProfileTag[] => {
  switch (preferredMode) {
    case 'combat':
      return ['combat', 'risky'];
    case 'story':
      return ['story', 'social'];
    case 'exploration':
      return ['exploration', 'cautious'];
    default:
      return ['exploration', 'story'];
  }
};

const buildGameConfig = (
  input: WorldArchitectInput,
  overrides: Partial<GameConfigState>,
): GameConfigState => ({
  theme: input.theme,
  worldStyle: overrides.worldStyle ?? `${input.theme} frontier`,
  difficulty: input.difficulty,
  gameGoal:
    overrides.gameGoal ?? 'Stabilize the world state and complete the main ward arc.',
  learningGoal: overrides.learningGoal,
  preferredMode: input.preferredMode,
  templateId: overrides.templateId,
  quickStartEnabled: overrides.quickStartEnabled ?? true,
  devModeEnabled: overrides.devModeEnabled ?? false,
  autosaveEnabled: overrides.autosaveEnabled ?? true,
  autoLoadEnabled: overrides.autoLoadEnabled ?? true,
  presentationModeEnabled: overrides.presentationModeEnabled ?? false,
});

interface WorldCreationControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  saveController?: SaveWriter;
  logger?: GameLogger;
  now?: TimestampProvider;
}

export interface WorldCreationRequest extends WorldArchitectInput {
  learningGoal?: string;
  gameGoal?: string;
  templateId?: string;
  quickStartEnabled?: boolean;
  devModeEnabled?: boolean;
  autosaveEnabled?: boolean;
  autoLoadEnabled?: boolean;
  presentationModeEnabled?: boolean;
  saveAfterCreate?: boolean;
}

export class WorldCreationController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly saveController?: SaveWriter;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  constructor(options: WorldCreationControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.saveController = options.saveController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async createWorld(request: WorldCreationRequest): Promise<SaveSnapshot> {
    const timestamp = this.now();
    const worldOutput = await this.agents.worldArchitect.run(request);
    this.logger?.recordAgentDecision({
      agentId: 'world-architect',
      createdAt: timestamp,
      inputSummary: `Theme=${request.theme}, mode=${request.preferredMode}, difficulty=${request.difficulty}`,
      outputSummary: `World=${worldOutput.world.summary.name}, areas=${worldOutput.areas.length}`,
      input: request,
      output: worldOutput,
    });
    const questOutput = await this.agents.questDesigner.run({
      world: worldOutput.world,
      areas: worldOutput.areas,
      npcDefinitions: mockNpcDefinitions,
      questCount: {
        main: 1,
        side: 3,
      },
    });
    this.logger?.recordAgentDecision({
      agentId: 'quest-designer',
      createdAt: timestamp,
      inputSummary: `Quest seed for ${worldOutput.world.summary.name}`,
      outputSummary: `Generated ${questOutput.quests.length} quests`,
      input: {
        worldId: worldOutput.world.summary.id,
        questCount: {
          main: 1,
          side: 3,
        },
      },
      output: questOutput,
    });

    const builtAreas = [];
    for (const area of worldOutput.areas) {
      const buildResult = await this.agents.levelBuilder.run({
        area,
        world: worldOutput.world,
        questContext: questOutput.quests,
      });
      builtAreas.push(buildResult.area);
      this.logger?.recordAgentDecision({
        agentId: 'level-builder',
        createdAt: timestamp,
        inputSummary: `Area=${area.id}`,
        outputSummary: `Interaction points=${buildResult.interactionPoints.length}`,
        input: {
          areaId: area.id,
        },
        output: buildResult,
      });
    }

    const questProgressEntries: QuestProgress[] = [];
    const questHistory: QuestHistoryEntry[] = [];

    for (const definition of questOutput.quests) {
      const availability = evaluateQuestAvailability({
        definition,
        questProgressEntries,
        worldFlags: worldOutput.world.flags,
        now: timestamp,
      });

      if (!availability.progress) {
        continue;
      }

      const progress: QuestProgress =
        definition.type === 'main' && availability.status === 'available'
          ? {
              ...availability.progress,
              status: 'active',
            }
          : availability.progress;

      questProgressEntries.push(progress);
      questHistory.push({
        questId: definition.id,
        status: progress.status,
        note: `Quest "${definition.title}" seeded during world creation.`,
        updatedAt: timestamp,
      });
    }

    const playerTags = derivePlayerTags(request.preferredMode);
    const player: PlayerState = {
      hp: 30,
      maxHp: 30,
      energy: 10,
      gold: 20,
      inventory: [],
      profileTags: playerTags,
      currentAreaId: worldOutput.world.startingAreaId,
    };
    const playerModel: PlayerModelState = {
      tags: playerTags,
      rationale: ['World creation seeded the initial player profile from the selected mode.'],
      recentAreaVisits: [worldOutput.world.startingAreaId],
      recentQuestChoices: [],
      npcInteractionCount: 0,
      dominantStyle: playerTags[0],
      lastUpdatedAt: timestamp,
    };

    const snapshot: SaveSnapshot = {
      metadata: {
        id: `save:${worldOutput.world.summary.id}-slot-1`,
        version: '0.1.0',
        slot: 'slot-1',
        label: `${worldOutput.world.summary.name} opening state`,
        createdAt: timestamp,
        updatedAt: timestamp,
        source: 'manual',
      },
      world: worldOutput.world,
      areas: builtAreas,
      map: {
        currentAreaId: worldOutput.world.startingAreaId,
        discoveredAreaIds: [worldOutput.world.startingAreaId],
        unlockedAreaIds: uniqueIds(
          builtAreas
            .filter((area) => area.unlockedByDefault)
            .map((area) => area.id),
        ),
        visitHistory: [worldOutput.world.startingAreaId],
      },
      quests: {
        definitions: questOutput.quests,
        progress: questProgressEntries,
        history: questHistory,
      },
      npcs: {
        definitions: mockNpcDefinitions,
        runtime: mockNpcStates,
      },
      player,
      playerModel,
      events: {
        definitions: this.store.getState().eventDefinitionOrder.map(
          (eventId) => this.store.getState().eventDefinitionsById[eventId],
        ),
        history: [],
        director: {
          pendingEventIds: [],
          worldTension: 0,
          randomnessDisabled: false,
        },
      },
      combatSystem: {
        encounters: [mockBossEncounterDefinition],
        active: null,
        history: [],
      },
      combat: null,
      config: buildGameConfig(request, request),
      resources: {
        activeTheme: request.theme,
        entries: [],
        loadedResourceKeys: [],
      },
      reviewState: {
        current: null,
        history: [],
      } satisfies ReviewState,
      review: null,
    };

    this.store.getState().hydrateFromSnapshot(snapshot);

    if (request.saveAfterCreate ?? true) {
      await maybeAutoSave(this.store, this.saveController, 'manual');
    }

    return snapshot;
  }
}
