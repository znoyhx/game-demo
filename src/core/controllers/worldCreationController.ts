import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import {
  defaultWorldCreationRequest,
  devTestWorldCreationRequest,
  findWorldCreationTemplate,
  mockBossEncounterDefinition,
  mockNpcDefinitions,
  mockNpcStates,
  mockQuestDefinitions,
  mockSaveSnapshot,
  mockWorldEvents,
  quickPlayWorldCreationRequest,
} from '../mocks';
import type { GameLogger } from '../logging';
import type {
  Area,
  CombatEncounterDefinition,
  GameConfigState,
  NpcDefinition,
  NpcState,
  PlayerModelState,
  PlayerProfileTag,
  PlayerState,
  QuestDefinition,
  QuestHistoryEntry,
  QuestProgress,
  ResourceState,
  SaveSnapshot,
  World,
  WorldCreationFallbackReason,
  WorldCreationOutputs,
  WorldCreationRequest,
  WorldCreationResult,
  WorldEvent,
} from '../schemas';
import {
  gameConfigStateSchema,
  npcDefinitionSchema,
  npcStateSchema,
  resourceStateSchema,
  saveSnapshotSchema,
  worldCreationOutputsSchema,
  worldCreationRequestSchema,
  worldCreationResultSchema,
} from '../schemas';
import type { GameStoreState } from '../state';
import { locale } from '../utils/locale';

import {
  CURRENT_SAVE_SCHEMA_VERSION,
  evaluateQuestAvailability,
} from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';

const uniqueIds = (values: string[]) => Array.from(new Set(values));

const toTitleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pickFocusWord = (value: string) =>
  toTitleCase(value).split(' ').find(Boolean) ?? 'Forge';

const toSentenceCase = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
};

const derivePlayerTags = (
  preferredMode: WorldCreationRequest['preferredMode'],
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

const preferredModeLabels = locale.labels.preferredModes;
const fallbackReasonLabels: Record<WorldCreationFallbackReason, string> =
  locale.labels.worldCreationFallbackReasons;
const worldCreationText = locale.controllers.worldCreation;

const buildStoryPremise = (request: WorldCreationRequest, worldName: string) =>
  worldCreationText.buildStoryPremise(
    worldName,
    request.worldStyle,
    request.gameGoal.trim(),
  );

const buildGameConfig = (
  request: WorldCreationRequest,
  storyPremise: string,
): GameConfigState =>
  gameConfigStateSchema.parse({
    theme: request.theme,
    worldStyle: request.worldStyle,
    difficulty: request.difficulty,
    gameGoal: request.gameGoal,
    learningGoal: request.learningGoal,
    storyPremise,
    preferredMode: request.preferredMode,
    templateId: request.templateId,
    quickStartEnabled: request.quickStartEnabled,
    devModeEnabled: request.devModeEnabled,
    autosaveEnabled: request.autosaveEnabled,
    autoLoadEnabled: request.autoLoadEnabled,
    presentationModeEnabled: request.presentationModeEnabled,
  });

const buildNpcDefinitions = (
  request: WorldCreationRequest,
  world: World,
  areas: Area[],
): NpcDefinition[] => {
  const firstArea = areas[0] ?? mockSaveSnapshot.areas[0];
  const secondArea = areas[1] ?? mockSaveSnapshot.areas[1];
  const thirdArea = areas[2] ?? mockSaveSnapshot.areas[2];
  const friendlyFaction = world.factions[0]?.id;
  const hostileFaction = world.factions[1]?.id ?? friendlyFaction;
  const modeTag = request.preferredMode;

  return mockNpcDefinitions.map((definition) =>
    npcDefinitionSchema.parse({
      ...definition,
      factionId:
        definition.role === 'boss' ? hostileFaction ?? definition.factionId : friendlyFaction,
      areaId:
        definition.role === 'boss'
          ? thirdArea.id
          : definition.role === 'guide' || definition.role === 'merchant'
            ? firstArea.id
            : secondArea.id,
      personalityTags: uniqueIds([...definition.personalityTags, modeTag]),
    }),
  );
};

const buildNpcStates = (
  request: WorldCreationRequest,
  world: World,
  areas: Area[],
  questDefinitions: QuestDefinition[],
  questProgressEntries: QuestProgress[],
  timestamp: string,
): NpcState[] => {
  const firstArea = areas[0] ?? mockSaveSnapshot.areas[0];
  const secondArea = areas[1] ?? mockSaveSnapshot.areas[1];
  const thirdArea = areas[2] ?? mockSaveSnapshot.areas[2];
  const sharedLongTerm = worldCreationText.sharedLongTerm(request.gameGoal.trim());
  const issuedQuestIdsByNpcId = questDefinitions.reduce<Record<string, string[]>>(
    (accumulator, definition) => {
      const progress = questProgressEntries.find(
        (entry) => entry.questId === definition.id,
      );

      if (
        !definition.giverNpcId ||
        !progress ||
        (progress.status !== 'active' &&
          progress.status !== 'completed' &&
          progress.status !== 'failed')
      ) {
        return accumulator;
      }

      return {
        ...accumulator,
        [definition.giverNpcId]: [
          ...(accumulator[definition.giverNpcId] ?? []),
          definition.id,
        ],
      };
    },
    {},
  );

  return mockNpcStates.map((state) =>
    npcStateSchema.parse({
      ...state,
      memory: {
        shortTerm: [
          worldCreationText.npcMemoryShortTerm(
            preferredModeLabels[request.preferredMode],
            world.summary.name,
          ),
        ],
        longTerm: [sharedLongTerm],
        lastInteractionAt: request.devModeEnabled ? timestamp : undefined,
      },
      revealableInfo: {
        publicFacts: [
          worldCreationText.npcPublicFact(
            mockNpcDefinitions.find((definition) => definition.id === state.npcId)?.name ??
              state.npcId,
            world.summary.name,
          ),
        ],
        trustGatedFacts: [
          {
            minTrust: state.currentDisposition === 'hostile' ? 0 : 20,
            fact: worldCreationText.npcTrustFact(
              toSentenceCase(request.gameGoal),
              state.npcId === mockNpcDefinitions[0]?.id
                ? firstArea.name
                : state.npcId === mockNpcDefinitions[1]?.id
                  ? firstArea.name
                  : state.npcId === mockNpcDefinitions[2]?.id
                    ? secondArea.name
                    : state.npcId === mockNpcDefinitions[3]?.id
                      ? secondArea.name
                      : thirdArea.name,
            ),
          },
        ],
        hiddenSecrets: [
          worldCreationText.npcHiddenSecret(world.summary.name, thirdArea.name),
        ],
      },
      currentGoal:
        state.npcId === mockNpcDefinitions[0]?.id
          ? worldCreationText.npcGoals.guide(request.gameGoal.trim())
          : state.npcId === mockNpcDefinitions[1]?.id
            ? worldCreationText.npcGoals.merchant(request.gameGoal.trim())
            : state.npcId === mockNpcDefinitions[2]?.id
              ? worldCreationText.npcGoals.scholar(request.gameGoal.trim())
          : state.npcId === mockNpcDefinitions[3]?.id
            ? worldCreationText.npcGoals.guard(secondArea.name)
            : worldCreationText.npcGoals.boss(request.gameGoal.trim()),
      hasGivenQuestIds: issuedQuestIdsByNpcId[state.npcId] ?? [],
      flags: {
        ...state.flags,
        quickStartSeeded: request.quickStartEnabled,
        devWorldSeeded: request.devModeEnabled,
      },
    }),
  );
};

const buildEventDefinitions = (
  world: World,
  areas: Area[],
  request: WorldCreationRequest,
): WorldEvent[] => {
  const firstArea = areas[0] ?? mockSaveSnapshot.areas[0];
  const secondArea = areas[1] ?? mockSaveSnapshot.areas[1];
  const thirdArea = areas[2] ?? mockSaveSnapshot.areas[2];

  return mockWorldEvents.map((event, index) => ({
    ...event,
    title:
      index === 0
        ? worldCreationText.eventTitles.areaDisruption(firstArea.name)
        : index === 1
          ? worldCreationText.eventTitles.areaSignal(secondArea.name)
          : worldCreationText.eventTitles.areaCountermeasure(thirdArea.name),
    description:
      index === 0
        ? worldCreationText.eventDescriptions.opening(world.summary.name)
        : index === 1
          ? worldCreationText.eventDescriptions.midpoint(request.gameGoal.trim())
          : worldCreationText.eventDescriptions.finale(
              preferredModeLabels[request.preferredMode],
            ),
  }));
};

const buildResourceState = (
  request: WorldCreationRequest,
  world: World,
  areas: Area[],
  npcs: NpcDefinition[],
): ResourceState => {
  const selectedArea = areas.find((area) => area.id === world.startingAreaId) ?? areas[0];
  const tilesetKey = `tileset-${toSlug(request.worldStyle)}`;
  const selectedBackgroundKey =
    selectedArea?.backgroundKey ?? `bg-${toSlug(selectedArea?.name ?? world.summary.name)}`;
  const selectedMusicKey =
    selectedArea?.musicKey ?? `music-${toSlug(selectedArea?.name ?? world.summary.name)}`;

  return resourceStateSchema.parse({
    activeTheme: request.theme,
    entries: [
      {
        id: `resource:${tilesetKey}`,
        kind: 'tileset',
        key: tilesetKey,
        label: worldCreationText.resources.tileset(toTitleCase(request.worldStyle)),
        source: `generated://${tilesetKey}`,
      },
      ...areas.flatMap((area) => [
        {
          id: `resource:bg:${area.id}`,
          kind: 'background' as const,
          key: area.backgroundKey ?? `bg-${toSlug(area.name)}`,
          label: worldCreationText.resources.background(area.name),
          areaId: area.id,
          source: `generated://background/${toSlug(area.name)}`,
        },
        {
          id: `resource:music:${area.id}`,
          kind: 'music' as const,
          key: area.musicKey ?? `music-${toSlug(area.name)}`,
          label: worldCreationText.resources.music(area.name),
          areaId: area.id,
          source: `generated://music/${toSlug(area.name)}`,
        },
      ]),
      ...npcs.map((npc) => ({
        id: `resource:avatar:${npc.id}`,
        kind: 'avatar' as const,
        key: npc.avatarKey ?? `avatar-${toSlug(npc.name)}`,
        label: worldCreationText.resources.avatar(npc.name),
        npcId: npc.id,
        source: `generated://avatar/${toSlug(npc.name)}`,
      })),
    ],
    loadedResourceKeys: uniqueIds(
      [
        tilesetKey,
        selectedBackgroundKey,
        selectedMusicKey,
        ...npcs.slice(0, 2).map((npc) => npc.avatarKey ?? `avatar-${toSlug(npc.name)}`),
      ].filter(Boolean),
    ),
    selectedBackgroundKey,
    selectedTilesetKey: tilesetKey,
    selectedMusicKey,
  });
};

const buildCombatEncounter = (
  areas: Area[],
  npcs: NpcDefinition[],
  world: World,
): CombatEncounterDefinition => {
  const bossArea = areas[2] ?? mockSaveSnapshot.areas[2];
  const bossNpc = npcs.find((npc) => npc.role === 'boss') ?? npcs[npcs.length - 1];

  return {
    ...mockBossEncounterDefinition,
    title: worldCreationText.encounterTitle(world.summary.name),
    areaId: bossArea.id,
    enemyNpcId: bossNpc?.id,
  };
};

const buildQuestProgressEntries = (
  questDefinitions: QuestDefinition[],
  world: World,
  timestamp: string,
): {
  progress: QuestProgress[];
  history: QuestHistoryEntry[];
} => {
  const progressEntries: QuestProgress[] = [];
  const history: QuestHistoryEntry[] = [];

    for (const definition of questDefinitions) {
      const availability = evaluateQuestAvailability({
        definition,
        questProgressEntries: progressEntries,
        worldFlags: world.flags,
        currentAreaId: world.startingAreaId,
        visitedAreaIds: [world.startingAreaId],
        now: timestamp,
      });

      if (!availability.progress) {
        continue;
      }

      const progress: QuestProgress =
        (definition.type === 'main' || definition.type === 'dynamic') &&
        availability.status === 'available'
          ? {
              ...availability.progress,
              status: 'active',
            }
          : availability.progress;

    progressEntries.push(progress);
    history.push({
      questId: definition.id,
      status: progress.status,
      note: worldCreationText.questInjectedNote(definition.title),
      updatedAt: timestamp,
    });
  }

  return {
    progress: progressEntries,
    history,
  };
};

const buildPlayerState = (
  request: WorldCreationRequest,
  world: World,
  tags: PlayerProfileTag[],
): PlayerState => {
  const profileByDifficulty = {
    easy: { hp: 36, maxHp: 36, gold: 30, energy: 12 },
    normal: { hp: 30, maxHp: 30, gold: 20, energy: 10 },
    hard: { hp: 26, maxHp: 26, gold: request.devModeEnabled ? 99 : 16, energy: 9 },
  } as const;

  const stats = profileByDifficulty[request.difficulty];

  return {
    hp: stats.hp,
    maxHp: stats.maxHp,
    energy: stats.energy,
    gold: stats.gold,
    inventory: request.quickStartEnabled ? [{ itemId: 'item:field-kit', quantity: 1 }] : [],
    profileTags: tags,
    currentAreaId: world.startingAreaId,
  };
};

const buildPlayerModelState = (
  request: WorldCreationRequest,
  world: World,
  tags: PlayerProfileTag[],
  timestamp: string,
): PlayerModelState => ({
  tags,
  rationale: [
    worldCreationText.playerModelRationale.fromMode(
      preferredModeLabels[request.preferredMode],
    ),
    request.devModeEnabled
      ? worldCreationText.playerModelRationale.devMode
      : worldCreationText.playerModelRationale.demoMode,
  ],
  recentAreaVisits: [world.startingAreaId],
  recentQuestChoices: [],
  npcInteractionCount: 0,
  dominantStyle: tags[0],
  stuckPoint: request.quickStartEnabled
    ? undefined
    : worldCreationText.playerModelRationale.stuckPoint,
  lastUpdatedAt: timestamp,
});

const buildOutputs = (
  snapshot: SaveSnapshot,
  storyPremise: string,
): WorldCreationOutputs =>
  worldCreationOutputsSchema.parse({
    worldName: snapshot.world.summary.name,
    regionNames: snapshot.areas.map((area) => area.name),
    factionNames: snapshot.world.factions.map((faction) => faction.name),
    mainQuestSeed:
      snapshot.quests.definitions.find((quest) => quest.type === 'main')?.title ??
      snapshot.quests.definitions[0]?.title ??
      worldCreationText.defaultMainQuestSeed,
    npcNames: snapshot.npcs.definitions.map((npc) => npc.name),
    resourceLabels: snapshot.resources?.entries.map((entry) => entry.label) ?? [],
    storyPremise,
  });

const buildSnapshot = (options: {
  request: WorldCreationRequest;
  timestamp: string;
  world: World;
  areas: Area[];
  questDefinitions: QuestDefinition[];
  storyPremise: string;
}): SaveSnapshot => {
  const { request, timestamp, world, areas, questDefinitions, storyPremise } = options;
  const npcDefinitions = buildNpcDefinitions(request, world, areas);
  const questState = buildQuestProgressEntries(questDefinitions, world, timestamp);
  const npcStates = buildNpcStates(
    request,
    world,
    areas,
    questDefinitions,
    questState.progress,
    timestamp,
  );
  const playerTags = derivePlayerTags(request.preferredMode);
  const player = buildPlayerState(request, world, playerTags);
  const playerModel = buildPlayerModelState(request, world, playerTags, timestamp);
  const events = buildEventDefinitions(world, areas, request);
  const eventDirector = {
    pendingEventIds:
      request.preferredMode === 'combat' ? [events[events.length - 1]?.id].filter(Boolean) : [],
    worldTension:
      request.difficulty === 'hard' ? 72 : request.difficulty === 'easy' ? 24 : 48,
    pacingNote: worldCreationText.pacingNote(
      preferredModeLabels[request.preferredMode],
    ),
    randomnessDisabled: request.devModeEnabled,
  };
  const combatEncounter = buildCombatEncounter(areas, npcDefinitions, world);
  const config = buildGameConfig(request, storyPremise);
  const resources = buildResourceState(request, world, areas, npcDefinitions);

    return saveSnapshotSchema.parse({
      metadata: {
        id: `save:${world.summary.id}:slot-1`,
        version: CURRENT_SAVE_SCHEMA_VERSION,
        slot: 'slot-1',
        label: worldCreationText.initialSaveLabel(world.summary.name),
        createdAt: timestamp,
      updatedAt: timestamp,
      source: request.devModeEnabled ? 'debug' : 'manual',
    },
    world,
    areas,
    map: {
      currentAreaId: world.startingAreaId,
      discoveredAreaIds: [world.startingAreaId],
      unlockedAreaIds: uniqueIds(areas.filter((area) => area.unlockedByDefault).map((area) => area.id)),
      visitHistory: [world.startingAreaId],
    },
    quests: {
      definitions: questDefinitions,
      progress: questState.progress,
      history: questState.history,
    },
    npcs: {
      definitions: npcDefinitions,
      runtime: npcStates,
    },
    player,
    playerModel,
    events: {
      definitions: events,
      history: [],
      director: eventDirector,
    },
    combatSystem: {
      encounters: [combatEncounter],
      active: null,
      history: [],
    },
    combat: null,
    config,
    resources,
    reviewState: {
      current: null,
      history: [],
    },
    review: null,
  });
};

const buildFallbackWorld = (
  request: WorldCreationRequest,
  timestamp: string,
): {
  world: World;
  areas: Area[];
  storyPremise: string;
} => {
  const focusWord = pickFocusWord(request.theme);
  const worldName = worldCreationText.fallbackWorldName(focusWord);
  const storyPremise = buildStoryPremise(request, worldName);
  const archiveUnlocked = request.quickStartEnabled || request.devModeEnabled;
  const sanctumUnlocked = request.devModeEnabled;
  const factions = mockSaveSnapshot.world.factions.map((faction, index) => ({
    ...faction,
    name:
      index === 0
        ? worldCreationText.fallbackFactionNames.defenders(focusWord)
        : worldCreationText.fallbackFactionNames.disruptors(focusWord),
    description:
      index === 0
        ? worldCreationText.fallbackFactionDescriptions.defenders(worldName)
        : worldCreationText.fallbackFactionDescriptions.disruptors(worldName),
  }));
  const areas = mockSaveSnapshot.areas.map((area, index) => ({
    ...area,
    name:
      index === 0
        ? worldCreationText.fallbackAreaNames.outpost(focusWord)
        : index === 1
          ? worldCreationText.fallbackAreaNames.archive(focusWord)
          : worldCreationText.fallbackAreaNames.sanctum(focusWord),
    description:
      index === 0
        ? worldCreationText.fallbackAreaDescriptions.opening(worldName)
        : index === 1
          ? worldCreationText.fallbackAreaDescriptions.midpoint(request.gameGoal.trim())
          : worldCreationText.fallbackAreaDescriptions.finale,
    unlockedByDefault: index === 0 ? true : index === 1 ? archiveUnlocked : sanctumUnlocked,
  }));

  return {
    world: {
      ...mockSaveSnapshot.world,
      summary: {
        ...mockSaveSnapshot.world.summary,
        id: `world:${toSlug(request.theme)}`,
        name: worldName,
        subtitle: worldCreationText.fallbackSubtitle(toTitleCase(request.worldStyle)),
        theme: request.theme,
        tone:
          request.difficulty === 'easy'
            ? 'light'
            : request.difficulty === 'hard'
              ? 'dark'
              : 'mysterious',
        mode: request.preferredMode,
        createdAt: timestamp,
      },
      factions,
      areaIds: areas.map((area) => area.id),
      flags: {
        tutorialCompleted: request.quickStartEnabled || request.devModeEnabled,
        archiveDoorOpened: archiveUnlocked,
        sanctumSealBroken: false,
        bromSupplyDelivered: false,
        archiveEchoSeen: false,
        rowanPatrolSecured: false,
        wardenAlertRaised: false,
      },
    },
    areas,
    storyPremise,
  };
};

const buildFallbackQuestDefinitions = (
  request: WorldCreationRequest,
  storyPremise: string,
): QuestDefinition[] =>
  mockQuestDefinitions.map((quest, index) =>
    quest.type === 'main'
      ? {
          ...quest,
          title: toSentenceCase(request.gameGoal),
          description: worldCreationText.fallbackQuestDescriptions.main(
            storyPremise,
            quest.description,
          ),
        }
      : quest.type === 'side'
        ? {
            ...quest,
            description: worldCreationText.fallbackQuestDescriptions.side(
              quest.description,
              index + 1,
              preferredModeLabels[request.preferredMode],
            ),
          }
        : {
            ...quest,
            description: `${quest.description} 该任务会作为${preferredModeLabels[request.preferredMode]}导向的补充任务，在回退路径中保持可验证状态。`,
          },
  );

const normalizeWorldCreationRequest = (
  request: WorldCreationRequest,
): WorldCreationRequest =>
  worldCreationRequestSchema.parse({
    ...request,
    theme: request.theme.trim(),
    worldStyle: request.worldStyle.trim(),
    gameGoal: request.gameGoal.trim(),
    learningGoal: request.learningGoal?.trim() ? request.learningGoal.trim() : undefined,
  });

interface WorldCreationControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  saveController?: SaveWriter;
  logger?: GameLogger;
  now?: TimestampProvider;
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

  async createDefaultWorld(): Promise<WorldCreationResult> {
    return this.createWorld(defaultWorldCreationRequest);
  }

  async createWorldFromTemplate(templateId: string): Promise<WorldCreationResult> {
    const template = findWorldCreationTemplate(templateId);

    if (!template) {
      throw new Error(worldCreationText.missingTemplate(templateId));
    }

    return this.createWorld(template.request);
  }

  async createQuickPlayWorld(): Promise<WorldCreationResult> {
    return this.createWorld(quickPlayWorldCreationRequest);
  }

  async createDevTestWorld(): Promise<WorldCreationResult> {
    return this.createWorld(devTestWorldCreationRequest);
  }

  async createWorld(request: WorldCreationRequest): Promise<WorldCreationResult> {
    const validatedRequest = normalizeWorldCreationRequest(request);
    const timestamp = this.now();
    const result = await this.generateWorldResult(validatedRequest, timestamp);

    const state = this.store.getState();

    state.hydrateFromSnapshot(result.snapshot);
    state.setStartupState('generated', 'world-created');
    state.setRecoveryNotice(
      result.usedFallback && result.fallbackReason
        ? worldCreationText.recoveryNotice(
            fallbackReasonLabels[result.fallbackReason],
          )
        : null,
    );

    if (validatedRequest.saveAfterCreate ?? true) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        validatedRequest.devModeEnabled ? 'debug' : 'manual',
      );
    }

    return result;
  }

  private async generateWorldResult(
    request: WorldCreationRequest,
    timestamp: string,
  ): Promise<WorldCreationResult> {
    let fallbackReason: WorldCreationFallbackReason = 'world-architect-failed';

    try {
      const worldOutput = await this.agents.worldArchitect.run({
        theme: request.theme,
        worldStyle: request.worldStyle,
        preferredMode: request.preferredMode,
        difficulty: request.difficulty,
        gameGoal: request.gameGoal,
        learningGoal: request.learningGoal,
        quickStartEnabled: request.quickStartEnabled,
        devModeEnabled: request.devModeEnabled,
        promptStyle: request.promptStyle,
      });
      this.logger?.recordAgentDecision({
        agentId: 'world-architect',
        createdAt: timestamp,
        inputSummary: worldCreationText.logs.worldArchitectInput(
          request.theme,
          request.worldStyle,
          preferredModeLabels[request.preferredMode],
        ),
        outputSummary: worldCreationText.logs.worldArchitectOutput(
          worldOutput.world.summary.name,
          worldOutput.areas.length,
        ),
        input: request,
        output: worldOutput,
      });

      fallbackReason = 'npc-pack-failed';
      const npcDefinitions = buildNpcDefinitions(request, worldOutput.world, worldOutput.areas);

      fallbackReason = 'quest-designer-failed';
      const questOutput = await this.agents.questDesigner.run({
        world: worldOutput.world,
        areas: worldOutput.areas,
        npcDefinitions,
        gameGoal: request.gameGoal,
        learningGoal: request.learningGoal,
        storyPremise: worldOutput.storyPremise,
        questCount: {
          main: 1,
          side: 3,
        },
      });
      this.logger?.recordAgentDecision({
        agentId: 'quest-designer',
        createdAt: timestamp,
        inputSummary: worldCreationText.logs.questDesignerInput(
          worldOutput.world.summary.name,
        ),
        outputSummary: worldCreationText.logs.questDesignerOutput(
          questOutput.quests.length,
        ),
        input: {
          worldId: worldOutput.world.summary.id,
          gameGoal: request.gameGoal,
          questCount: {
            main: 1,
            side: 3,
          },
        },
        output: questOutput,
      });

      fallbackReason = 'level-builder-failed';
      const builtAreas: Area[] = [];
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
          inputSummary: worldCreationText.logs.levelBuilderInput(area.id),
          outputSummary: worldCreationText.logs.levelBuilderOutput(
            buildResult.interactionPoints.length,
          ),
          input: {
            areaId: area.id,
          },
          output: buildResult,
        });
      }

      fallbackReason = 'snapshot-invalid';
      const snapshot = buildSnapshot({
        request,
        timestamp,
        world: worldOutput.world,
        areas: builtAreas,
        questDefinitions: questOutput.quests,
        storyPremise: worldOutput.storyPremise,
      });

      return worldCreationResultSchema.parse({
        snapshot,
        outputs: buildOutputs(snapshot, worldOutput.storyPremise),
        usedFallback: false,
      });
    } catch {
      const fallbackWorld = buildFallbackWorld(request, timestamp);
      const fallbackSnapshot = buildSnapshot({
        request,
        timestamp,
        world: fallbackWorld.world,
        areas: fallbackWorld.areas,
        questDefinitions: buildFallbackQuestDefinitions(request, fallbackWorld.storyPremise),
        storyPremise: fallbackWorld.storyPremise,
      });

      return worldCreationResultSchema.parse({
        snapshot: fallbackSnapshot,
        outputs: buildOutputs(fallbackSnapshot, fallbackWorld.storyPremise),
        usedFallback: true,
        fallbackReason,
      });
    }
  }
}
