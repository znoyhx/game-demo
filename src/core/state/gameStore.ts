import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import type { SaveSlotSummary } from '../persistence/storageAdapter';
import {
  type AppSessionState,
  type Area,
  type CombatEncounterDefinition,
  type CombatHistoryEntry,
  type CombatState,
  type DebugToolsState,
  type EventDirectorState,
  type EventLogEntry,
  type GameConfigState,
  type GameUiPanel,
  type GameUiState,
  type LoadFailureReason,
  type MapState,
  type NpcDefinition,
  type NpcState,
  type PlayerModelState,
  type PlayerProfileTag,
  type PlayerState,
  type QuestDefinition,
  type QuestHistoryEntry,
  type QuestProgress,
  type ResourceDefinition,
  type ResourceState,
  type ReviewPayload,
  type ReviewState,
  type SaveMetadata,
  type SaveSnapshot,
  type SessionSnapshot,
  type World,
  type WorldEvent,
  saveSnapshotSchema,
  sessionSnapshotSchema,
} from '../schemas';

type EntityMap<T> = Record<string, T>;
type WorldDefinitionState = Pick<World, 'summary' | 'factions' | 'areaIds' | 'startingAreaId'>;
type WorldRuntimeState = Pick<World, 'weather' | 'timeOfDay' | 'flags'>;

export type SaveLifecycleStatus =
  | 'hydrated'
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error';

export type StartupSource = 'pending' | 'save' | 'mock' | 'generated';
export type StartupReason =
  | 'booting'
  | 'save-restored'
  | 'no-save'
  | 'invalid-save'
  | 'storage-error'
  | 'world-created';

export interface SaveLoadState {
  ok: boolean;
  reason?: LoadFailureReason;
}

interface HydratedGameData {
  worldDefinition: WorldDefinitionState;
  worldRuntime: WorldRuntimeState;
  areasById: EntityMap<Area>;
  areaOrder: string[];
  mapState: MapState;
  questDefinitionsById: EntityMap<QuestDefinition>;
  questDefinitionOrder: string[];
  questProgressById: EntityMap<QuestProgress>;
  questProgressOrder: string[];
  questHistory: QuestHistoryEntry[];
  npcDefinitionsById: EntityMap<NpcDefinition>;
  npcDefinitionOrder: string[];
  npcStatesById: EntityMap<NpcState>;
  npcStateOrder: string[];
  player: PlayerState;
  playerModel: PlayerModelState;
  combatEncountersById: EntityMap<CombatEncounterDefinition>;
  combatEncounterOrder: string[];
  combatState: CombatState | null;
  combatHistory: CombatHistoryEntry[];
  eventDefinitionsById: EntityMap<WorldEvent>;
  eventDefinitionOrder: string[];
  eventHistory: EventLogEntry[];
  eventDirector: EventDirectorState;
  reviewState: ReviewState;
  gameConfig: GameConfigState;
  resourceState: ResourceState;
  saveMetadata: SaveMetadata;
  saveStatus: SaveLifecycleStatus;
  lastLoadState: SaveLoadState;
  startupSource: StartupSource;
  startupReason: StartupReason;
  availableSaveSlots: SaveSlotSummary[];
  recoveryNotice: string | null;
}

export interface WorldSlice {
  worldDefinition: WorldDefinitionState;
  worldRuntime: WorldRuntimeState;
  setWorld: (world: World) => void;
  setWorldDefinition: (definition: WorldDefinitionState) => void;
  setWorldRuntime: (runtime: WorldRuntimeState) => void;
  setWorldFlags: (flags: Partial<World['flags']>) => void;
  setWorldFlag: (flag: string, value: boolean) => void;
  setWorldWeather: (weather?: string) => void;
  setWorldTimeOfDay: (timeOfDay?: string) => void;
}

export interface MapSlice {
  areasById: EntityMap<Area>;
  areaOrder: string[];
  mapState: MapState;
  setAreas: (areas: Area[]) => void;
  setMapState: (mapState: MapState) => void;
  setCurrentAreaId: (areaId: string) => void;
  setUnlockedAreaIds: (areaIds: string[]) => void;
  setDiscoveredAreaIds: (areaIds: string[]) => void;
  appendAreaVisit: (areaId: string) => void;
}

export interface QuestSlice {
  questDefinitionsById: EntityMap<QuestDefinition>;
  questDefinitionOrder: string[];
  questProgressById: EntityMap<QuestProgress>;
  questProgressOrder: string[];
  questHistory: QuestHistoryEntry[];
  setQuestDefinitions: (definitions: QuestDefinition[]) => void;
  setQuestProgress: (progressEntries: QuestProgress[]) => void;
  upsertQuestProgress: (progress: QuestProgress) => void;
  setQuestHistory: (history: QuestHistoryEntry[]) => void;
  appendQuestHistory: (entry: QuestHistoryEntry) => void;
}

export interface NpcSlice {
  npcDefinitionsById: EntityMap<NpcDefinition>;
  npcDefinitionOrder: string[];
  npcStatesById: EntityMap<NpcState>;
  npcStateOrder: string[];
  setNpcDefinitions: (definitions: NpcDefinition[]) => void;
  setNpcStates: (states: NpcState[]) => void;
  upsertNpcState: (state: NpcState) => void;
}

export interface PlayerSlice {
  player: PlayerState;
  playerModel: PlayerModelState;
  setPlayerState: (player: PlayerState) => void;
  setPlayerTags: (tags: PlayerProfileTag[]) => void;
  setPlayerModelState: (playerModel: PlayerModelState) => void;
  setPlayerModelTags: (tags: PlayerProfileTag[]) => void;
  appendRecentAreaVisit: (areaId: string) => void;
  appendRecentQuestChoice: (choiceId: string) => void;
}

export interface CombatSlice {
  combatEncountersById: EntityMap<CombatEncounterDefinition>;
  combatEncounterOrder: string[];
  combatState: CombatState | null;
  combatHistory: CombatHistoryEntry[];
  setCombatEncounters: (encounters: CombatEncounterDefinition[]) => void;
  setCombatState: (combatState: CombatState | null) => void;
  clearCombatState: () => void;
  setCombatHistory: (history: CombatHistoryEntry[]) => void;
  appendCombatHistory: (entry: CombatHistoryEntry) => void;
}

export interface EventSlice {
  eventDefinitionsById: EntityMap<WorldEvent>;
  eventDefinitionOrder: string[];
  eventHistory: EventLogEntry[];
  eventDirector: EventDirectorState;
  setWorldEvents: (events: WorldEvent[]) => void;
  appendEventHistory: (entry: EventLogEntry) => void;
  setEventDirector: (eventDirector: EventDirectorState) => void;
  setPendingEventIds: (eventIds: string[]) => void;
  clearPendingEventIds: () => void;
  setWorldTension: (worldTension: number) => void;
}

export interface ReviewSlice {
  reviewState: ReviewState;
  setReviewState: (reviewState: ReviewState) => void;
  setCurrentReview: (review: ReviewPayload | null) => void;
  appendReviewHistory: (review: ReviewPayload) => void;
}

export interface ConfigResourceSlice {
  gameConfig: GameConfigState;
  resourceState: ResourceState;
  setGameConfig: (gameConfig: GameConfigState) => void;
  patchGameConfig: (configPatch: Partial<GameConfigState>) => void;
  setResourceState: (resourceState: ResourceState) => void;
  setLoadedResourceKeys: (resourceKeys: string[]) => void;
}

export interface SaveSlice {
  saveMetadata: SaveMetadata;
  saveStatus: SaveLifecycleStatus;
  lastLoadState: SaveLoadState;
  startupSource: StartupSource;
  startupReason: StartupReason;
  availableSaveSlots: SaveSlotSummary[];
  recoveryNotice: string | null;
  setSaveMetadata: (metadata: SaveMetadata) => void;
  setSaveStatus: (status: SaveLifecycleStatus) => void;
  setLastLoadState: (state: SaveLoadState) => void;
  setStartupState: (source: StartupSource, reason: StartupReason) => void;
  setAvailableSaveSlots: (slots: SaveSlotSummary[]) => void;
  setRecoveryNotice: (notice: string | null) => void;
}

export interface UiSessionSlice {
  ui: GameUiState;
  debugTools: DebugToolsState;
  appSession: AppSessionState;
  setUiState: (ui: GameUiState) => void;
  setActivePanel: (panel: GameUiPanel) => void;
  setSelectedNpcId: (npcId: string | null) => void;
  setSelectedQuestId: (questId: string | null) => void;
  setSelectedAreaId: (areaId: string | null) => void;
  setSelectedEventId: (eventId: string | null) => void;
  setDebugOverlayOpen: (isOpen: boolean) => void;
  setDebugToolsState: (debugTools: DebugToolsState) => void;
  patchDebugToolsState: (debugPatch: Partial<DebugToolsState>) => void;
  setAppSessionState: (session: AppSessionState) => void;
  appendRouteHistory: (routeId: AppSessionState['lastVisitedRouteId']) => void;
  touchSessionActivity: (timestamp?: string) => void;
  resetUiState: () => void;
  hydrateFromSessionSnapshot: (snapshot: SessionSnapshot) => void;
  exportSessionSnapshot: () => SessionSnapshot;
}

export interface GameStoreActions {
  hydrateFromSnapshot: (snapshot: SaveSnapshot) => void;
  exportSaveSnapshot: (metadataOverrides?: Partial<SaveMetadata>) => SaveSnapshot;
  resetToMockSnapshot: () => void;
}

export type GameStoreState = WorldSlice &
  MapSlice &
  QuestSlice &
  NpcSlice &
  PlayerSlice &
  CombatSlice &
  EventSlice &
  ReviewSlice &
  ConfigResourceSlice &
  SaveSlice &
  UiSessionSlice &
  GameStoreActions;

const defaultUiState = (): GameUiState => ({
  activePanel: 'map',
  selectedNpcId: null,
  selectedQuestId: null,
  selectedAreaId: null,
  selectedEventId: null,
  isDebugOverlayOpen: false,
});

const defaultDebugToolsState = (): DebugToolsState => ({
  debugModeEnabled: false,
  forcedAreaId: null,
  forcedQuestId: null,
  forcedNpcId: null,
  forcedEncounterId: null,
  forcedEventId: null,
  forcedTactic: null,
  injectedPlayerTags: [],
  logsPanelOpen: false,
});

const defaultAppSessionState = (): AppSessionState => ({
  lastVisitedRouteId: 'home',
  routeHistory: ['home'],
  hasHydratedSession: false,
});

const toEntityMap = <T>(
  items: T[],
  getKey: (item: T) => string,
): EntityMap<T> =>
  items.reduce<EntityMap<T>>((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});

const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

const appendUnique = (ids: string[], value: string): string[] =>
  uniqueIds([...ids, value]);

const markDirtyState = <T extends object>(
  partial: T,
): T & Pick<SaveSlice, 'saveStatus'> => ({
  ...partial,
  saveStatus: 'dirty',
});

const sanitizeFlagUpdates = (
  flags: Partial<World['flags']>,
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(flags).filter(
      (entry): entry is [string, boolean] => entry[1] !== undefined,
    ),
  );

const normalizeSaveSnapshot = (snapshot: SaveSnapshot): SaveSnapshot =>
  saveSnapshotSchema.parse(snapshot);

const normalizeSessionSnapshot = (
  snapshot: SessionSnapshot,
): SessionSnapshot => sessionSnapshotSchema.parse(snapshot);

const buildWorldDefinition = (world: World): WorldDefinitionState => ({
  summary: world.summary,
  factions: world.factions,
  areaIds: world.areaIds,
  startingAreaId: world.startingAreaId,
});

const buildWorldRuntime = (world: World): WorldRuntimeState => ({
  weather: world.weather,
  timeOfDay: world.timeOfDay,
  flags: world.flags,
});

const buildWorldFromSlices = (
  definition: WorldDefinitionState,
  runtime: WorldRuntimeState,
): World => ({
  ...definition,
  ...runtime,
});

const buildDefaultMapState = (
  areas: Area[],
  currentAreaId: string,
): MapState => ({
  currentAreaId,
  discoveredAreaIds: [currentAreaId],
  unlockedAreaIds: uniqueIds([
    currentAreaId,
    ...areas.filter((area) => area.unlockedByDefault).map((area) => area.id),
  ]),
  visitHistory: [currentAreaId],
});

const sanitizeMapState = (
  mapState: MapState,
  areasById: EntityMap<Area>,
  fallbackAreaId: string,
): MapState => {
  const validAreaIds = new Set(Object.keys(areasById));
  const currentAreaId = validAreaIds.has(mapState.currentAreaId)
    ? mapState.currentAreaId
    : fallbackAreaId;
  const sanitizeUniqueIds = (ids: string[]) => {
    const nextIds = ids.filter((areaId) => validAreaIds.has(areaId));
    return nextIds.length > 0 ? uniqueIds(nextIds) : [currentAreaId];
  };
  const sanitizeVisitHistory = (ids: string[]) => {
    const nextIds = ids.filter((areaId) => validAreaIds.has(areaId));

    if (nextIds.length === 0) {
      return [currentAreaId];
    }

    return nextIds[nextIds.length - 1] === currentAreaId
      ? nextIds
      : [...nextIds, currentAreaId];
  };

  return {
    currentAreaId,
    discoveredAreaIds: appendUnique(
      sanitizeUniqueIds(mapState.discoveredAreaIds),
      currentAreaId,
    ),
    unlockedAreaIds: appendUnique(
      sanitizeUniqueIds(mapState.unlockedAreaIds),
      currentAreaId,
    ),
    visitHistory: sanitizeVisitHistory(mapState.visitHistory),
  };
};

const buildDefaultPlayerModelState = (
  player: PlayerState,
  currentAreaId: string,
): PlayerModelState => ({
  tags: player.profileTags,
  rationale: [],
  recentAreaVisits: [currentAreaId],
  recentQuestChoices: [],
  npcInteractionCount: 0,
});

const buildDefaultEventDirectorState = (): EventDirectorState => ({
  pendingEventIds: [],
  worldTension: 0,
  randomnessDisabled: false,
});

const buildDefaultReviewState = (
  review: ReviewPayload | null | undefined,
): ReviewState => ({
  current: review ?? null,
  history: review ? [review] : [],
});

const buildDefaultGameConfig = (snapshot: SaveSnapshot): GameConfigState => {
  const mainQuest =
    snapshot.quests.definitions.find((quest) => quest.type === 'main') ??
    snapshot.quests.definitions[0];

  return {
    theme: snapshot.world.summary.theme,
    worldStyle:
      snapshot.world.summary.subtitle ?? `${snapshot.world.summary.theme}冒险`,
    difficulty: 'normal',
    gameGoal:
      mainQuest?.title ??
      '探索世界、完成任务，并稳定当前故事线。',
    storyPremise:
      snapshot.config?.storyPremise ??
      `${snapshot.world.summary.name}正处于危机之中，而第一条任务线将决定这次冒险如何稳定下来。`,
    preferredMode: snapshot.world.summary.mode,
    quickStartEnabled: true,
    devModeEnabled: false,
    autosaveEnabled: true,
    autoLoadEnabled: true,
    presentationModeEnabled: false,
  };
};

const buildResourceEntries = (snapshot: SaveSnapshot): ResourceDefinition[] => [
  ...snapshot.areas
    .filter((area) => area.backgroundKey)
    .map<ResourceDefinition>((area) => ({
      id: `resource:bg:${area.id}`,
      kind: 'background',
      key: area.backgroundKey ?? area.id,
      label: `${area.name}背景`,
      areaId: area.id,
    })),
  ...snapshot.areas
    .filter((area) => area.musicKey)
    .map<ResourceDefinition>((area) => ({
      id: `resource:music:${area.id}`,
      kind: 'music',
      key: area.musicKey ?? area.id,
      label: `${area.name}配乐`,
      areaId: area.id,
    })),
  ...snapshot.npcs.definitions
    .filter((npc) => npc.avatarKey)
    .map<ResourceDefinition>((npc) => ({
      id: `resource:avatar:${npc.id}`,
      kind: 'avatar',
      key: npc.avatarKey ?? npc.id,
      label: `${npc.name}头像`,
      npcId: npc.id,
    })),
];

const buildDefaultResourceState = (snapshot: SaveSnapshot): ResourceState => {
  const currentAreaId = snapshot.player.currentAreaId;
  const currentArea =
    snapshot.areas.find((area) => area.id === currentAreaId) ?? snapshot.areas[0];

  return {
    activeTheme: snapshot.world.summary.theme,
    entries: buildResourceEntries(snapshot),
    loadedResourceKeys: uniqueIds(
      [
        currentArea?.backgroundKey,
        currentArea?.musicKey,
        ...snapshot.npcs.definitions.map((npc) => npc.avatarKey),
      ].filter((entry): entry is string => Boolean(entry)),
    ),
    selectedBackgroundKey: currentArea?.backgroundKey,
    selectedTilesetKey: undefined,
    selectedMusicKey: currentArea?.musicKey,
  };
};

const buildHydratedGameData = (snapshot: SaveSnapshot): HydratedGameData => {
  const parsedSnapshot = normalizeSaveSnapshot(snapshot);
  const areasById = toEntityMap(parsedSnapshot.areas, (area) => area.id);
  const currentAreaId = parsedSnapshot.player.currentAreaId;

  return {
    worldDefinition: buildWorldDefinition(parsedSnapshot.world),
    worldRuntime: buildWorldRuntime(parsedSnapshot.world),
    areasById,
    areaOrder: parsedSnapshot.areas.map((area) => area.id),
    mapState: sanitizeMapState(
      {
        ...(parsedSnapshot.map ?? buildDefaultMapState(parsedSnapshot.areas, currentAreaId)),
        currentAreaId,
      },
      areasById,
      currentAreaId,
    ),
    questDefinitionsById: toEntityMap(
      parsedSnapshot.quests.definitions,
      (quest) => quest.id,
    ),
    questDefinitionOrder: parsedSnapshot.quests.definitions.map((quest) => quest.id),
    questProgressById: toEntityMap(
      parsedSnapshot.quests.progress,
      (progress) => progress.questId,
    ),
    questProgressOrder: parsedSnapshot.quests.progress.map((progress) => progress.questId),
    questHistory: parsedSnapshot.quests.history ?? [],
    npcDefinitionsById: toEntityMap(
      parsedSnapshot.npcs.definitions,
      (npc) => npc.id,
    ),
    npcDefinitionOrder: parsedSnapshot.npcs.definitions.map((npc) => npc.id),
    npcStatesById: toEntityMap(
      parsedSnapshot.npcs.runtime,
      (npcState) => npcState.npcId,
    ),
    npcStateOrder: parsedSnapshot.npcs.runtime.map((npcState) => npcState.npcId),
    player: {
      ...parsedSnapshot.player,
      currentAreaId,
    },
    playerModel:
      parsedSnapshot.playerModel ??
      buildDefaultPlayerModelState(parsedSnapshot.player, currentAreaId),
    combatEncountersById: toEntityMap(
      parsedSnapshot.combatSystem?.encounters ?? [],
      (encounter) => encounter.id,
    ),
    combatEncounterOrder: (parsedSnapshot.combatSystem?.encounters ?? []).map(
      (encounter) => encounter.id,
    ),
    combatState:
      parsedSnapshot.combatSystem?.active ?? parsedSnapshot.combat ?? null,
    combatHistory: parsedSnapshot.combatSystem?.history ?? [],
    eventDefinitionsById: toEntityMap(
      parsedSnapshot.events.definitions,
      (event) => event.id,
    ),
    eventDefinitionOrder: parsedSnapshot.events.definitions.map((event) => event.id),
    eventHistory: parsedSnapshot.events.history,
    eventDirector:
      parsedSnapshot.events.director ?? buildDefaultEventDirectorState(),
    reviewState:
      parsedSnapshot.reviewState ?? buildDefaultReviewState(parsedSnapshot.review),
    gameConfig:
      parsedSnapshot.config ?? buildDefaultGameConfig(parsedSnapshot),
    resourceState:
      parsedSnapshot.resources ?? buildDefaultResourceState(parsedSnapshot),
    saveMetadata: parsedSnapshot.metadata,
    saveStatus: 'hydrated',
    lastLoadState: { ok: true },
    startupSource: 'pending',
    startupReason: 'booting',
    availableSaveSlots: [],
    recoveryNotice: null,
  };
};

const buildSaveSnapshotFromState = (
  state: Pick<
    GameStoreState,
    | 'worldDefinition'
    | 'worldRuntime'
    | 'areasById'
    | 'areaOrder'
    | 'mapState'
    | 'questDefinitionsById'
    | 'questDefinitionOrder'
    | 'questProgressById'
    | 'questProgressOrder'
    | 'questHistory'
    | 'npcDefinitionsById'
    | 'npcDefinitionOrder'
    | 'npcStatesById'
    | 'npcStateOrder'
    | 'player'
    | 'playerModel'
    | 'combatEncountersById'
    | 'combatEncounterOrder'
    | 'combatState'
    | 'combatHistory'
    | 'eventDefinitionsById'
    | 'eventDefinitionOrder'
    | 'eventHistory'
    | 'eventDirector'
    | 'reviewState'
    | 'gameConfig'
    | 'resourceState'
    | 'saveMetadata'
  >,
  metadataOverrides?: Partial<SaveMetadata>,
): SaveSnapshot => {
  const currentAreaId = state.mapState.currentAreaId;
  const snapshot: SaveSnapshot = {
    metadata: {
      ...state.saveMetadata,
      ...metadataOverrides,
    },
    world: buildWorldFromSlices(state.worldDefinition, state.worldRuntime),
    areas: state.areaOrder.map((areaId) => state.areasById[areaId]),
    map: state.mapState,
    quests: {
      definitions: state.questDefinitionOrder.map(
        (questId) => state.questDefinitionsById[questId],
      ),
      progress: state.questProgressOrder.map(
        (questId) => state.questProgressById[questId],
      ),
      history: state.questHistory,
    },
    npcs: {
      definitions: state.npcDefinitionOrder.map(
        (npcId) => state.npcDefinitionsById[npcId],
      ),
      runtime: state.npcStateOrder.map((npcId) => state.npcStatesById[npcId]),
    },
    player: {
      ...state.player,
      currentAreaId,
      profileTags: state.playerModel.tags,
    },
    playerModel: state.playerModel,
    events: {
      definitions: state.eventDefinitionOrder.map(
        (eventId) => state.eventDefinitionsById[eventId],
      ),
      history: state.eventHistory,
      director: state.eventDirector,
    },
    combatSystem: {
      encounters: state.combatEncounterOrder.map(
        (encounterId) => state.combatEncountersById[encounterId],
      ),
      active: state.combatState,
      history: state.combatHistory,
    },
    combat: state.combatState,
    config: state.gameConfig,
    resources: state.resourceState,
    review: state.reviewState.current,
    reviewState: state.reviewState,
  };

  return normalizeSaveSnapshot(snapshot);
};

const buildSessionSnapshotFromState = (
  state: Pick<GameStoreState, 'ui' | 'debugTools' | 'appSession'>,
): SessionSnapshot =>
  normalizeSessionSnapshot({
    ui: state.ui,
    debug: state.debugTools,
    session: state.appSession,
  });

export const createGameStore = (initialSnapshot: SaveSnapshot = mockSaveSnapshot) => {
  const initialData = buildHydratedGameData(initialSnapshot);

  return createStore<GameStoreState>()((set, get) => ({
    ...initialData,
    ui: defaultUiState(),
    debugTools: defaultDebugToolsState(),
    appSession: defaultAppSessionState(),

    setWorld: (world) => {
      set(
        markDirtyState({
          worldDefinition: buildWorldDefinition(world),
          worldRuntime: buildWorldRuntime(world),
        }),
      );
    },
    setWorldDefinition: (worldDefinition) => {
      set(markDirtyState({ worldDefinition }));
    },
    setWorldRuntime: (worldRuntime) => {
      set(markDirtyState({ worldRuntime }));
    },
    setWorldFlags: (flags) => {
      set((state) =>
        markDirtyState({
          worldRuntime: {
            ...state.worldRuntime,
            flags: {
              ...state.worldRuntime.flags,
              ...sanitizeFlagUpdates(flags),
            },
          },
        }),
      );
    },
    setWorldFlag: (flag, value) => {
      set((state) =>
        markDirtyState({
          worldRuntime: {
            ...state.worldRuntime,
            flags: {
              ...state.worldRuntime.flags,
              [flag]: value,
            },
          },
        }),
      );
    },
    setWorldWeather: (weather) => {
      set((state) =>
        markDirtyState({
          worldRuntime: {
            ...state.worldRuntime,
            weather,
          },
        }),
      );
    },
    setWorldTimeOfDay: (timeOfDay) => {
      set((state) =>
        markDirtyState({
          worldRuntime: {
            ...state.worldRuntime,
            timeOfDay,
          },
        }),
      );
    },

    setAreas: (areas) => {
      set((state) => {
        const areasById = toEntityMap(areas, (area) => area.id);
        const currentAreaId =
          areasById[state.mapState.currentAreaId]
            ? state.mapState.currentAreaId
            : areas[0]?.id ?? state.mapState.currentAreaId;

        return markDirtyState({
          areasById,
          areaOrder: areas.map((area) => area.id),
          mapState: sanitizeMapState(state.mapState, areasById, currentAreaId),
          worldDefinition: {
            ...state.worldDefinition,
            areaIds: areas.map((area) => area.id),
          },
        });
      });
    },
    setMapState: (mapState) => {
      set((state) => {
        const nextMapState = sanitizeMapState(
          mapState,
          state.areasById,
          state.player.currentAreaId,
        );

        return markDirtyState({
          mapState: nextMapState,
          player: {
            ...state.player,
            currentAreaId: nextMapState.currentAreaId,
          },
        });
      });
    },
    setCurrentAreaId: (areaId) => {
      set((state) => {
        const nextMapState = sanitizeMapState(
          {
            ...state.mapState,
            currentAreaId: areaId,
            discoveredAreaIds: appendUnique(state.mapState.discoveredAreaIds, areaId),
            unlockedAreaIds: appendUnique(state.mapState.unlockedAreaIds, areaId),
            visitHistory: [...state.mapState.visitHistory, areaId],
          },
          state.areasById,
          state.mapState.currentAreaId,
        );

        return markDirtyState({
          mapState: nextMapState,
          player: {
            ...state.player,
            currentAreaId: nextMapState.currentAreaId,
          },
          playerModel: {
            ...state.playerModel,
            recentAreaVisits: [...state.playerModel.recentAreaVisits, areaId],
          },
        });
      });
    },
    setUnlockedAreaIds: (areaIds) => {
      set((state) =>
        markDirtyState({
          mapState: sanitizeMapState(
            {
              ...state.mapState,
              unlockedAreaIds: areaIds,
            },
            state.areasById,
            state.mapState.currentAreaId,
          ),
        }),
      );
    },
    setDiscoveredAreaIds: (areaIds) => {
      set((state) =>
        markDirtyState({
          mapState: sanitizeMapState(
            {
              ...state.mapState,
              discoveredAreaIds: areaIds,
            },
            state.areasById,
            state.mapState.currentAreaId,
          ),
        }),
      );
    },
    appendAreaVisit: (areaId) => {
      set((state) =>
        markDirtyState({
          mapState: sanitizeMapState(
            {
              ...state.mapState,
              visitHistory: [...state.mapState.visitHistory, areaId],
            },
            state.areasById,
            state.mapState.currentAreaId,
          ),
        }),
      );
    },

    setQuestDefinitions: (definitions) => {
      set(
        markDirtyState({
          questDefinitionsById: toEntityMap(definitions, (definition) => definition.id),
          questDefinitionOrder: definitions.map((definition) => definition.id),
        }),
      );
    },
    setQuestProgress: (progressEntries) => {
      set(
        markDirtyState({
          questProgressById: toEntityMap(progressEntries, (progress) => progress.questId),
          questProgressOrder: progressEntries.map((progress) => progress.questId),
        }),
      );
    },
    upsertQuestProgress: (progress) => {
      set((state) => {
        const hasProgress = progress.questId in state.questProgressById;
        return markDirtyState({
          questProgressById: {
            ...state.questProgressById,
            [progress.questId]: progress,
          },
          questProgressOrder: hasProgress
            ? state.questProgressOrder
            : [...state.questProgressOrder, progress.questId],
        });
      });
    },
    setQuestHistory: (questHistory) => {
      set(markDirtyState({ questHistory }));
    },
    appendQuestHistory: (entry) => {
      set((state) =>
        markDirtyState({
          questHistory: [...state.questHistory, entry],
        }),
      );
    },

    setNpcDefinitions: (definitions) => {
      set(
        markDirtyState({
          npcDefinitionsById: toEntityMap(definitions, (definition) => definition.id),
          npcDefinitionOrder: definitions.map((definition) => definition.id),
        }),
      );
    },
    setNpcStates: (states) => {
      set(
        markDirtyState({
          npcStatesById: toEntityMap(states, (stateEntry) => stateEntry.npcId),
          npcStateOrder: states.map((stateEntry) => stateEntry.npcId),
        }),
      );
    },
    upsertNpcState: (npcState) => {
      set((state) => {
        const hasNpcState = npcState.npcId in state.npcStatesById;
        return markDirtyState({
          npcStatesById: {
            ...state.npcStatesById,
            [npcState.npcId]: npcState,
          },
          npcStateOrder: hasNpcState
            ? state.npcStateOrder
            : [...state.npcStateOrder, npcState.npcId],
        });
      });
    },

    setPlayerState: (player) => {
      set((state) => {
        const nextMapState = sanitizeMapState(
          {
            ...state.mapState,
            currentAreaId: player.currentAreaId,
            discoveredAreaIds: appendUnique(
              state.mapState.discoveredAreaIds,
              player.currentAreaId,
            ),
            unlockedAreaIds: appendUnique(
              state.mapState.unlockedAreaIds,
              player.currentAreaId,
            ),
            visitHistory: [...state.mapState.visitHistory, player.currentAreaId],
          },
          state.areasById,
          player.currentAreaId,
        );

        return markDirtyState({
          player,
          playerModel: {
            ...state.playerModel,
            tags: player.profileTags,
            recentAreaVisits: [...state.playerModel.recentAreaVisits, player.currentAreaId],
          },
          mapState: nextMapState,
        });
      });
    },
    setPlayerTags: (tags) => {
      set((state) =>
        markDirtyState({
          player: {
            ...state.player,
            profileTags: tags,
          },
          playerModel: {
            ...state.playerModel,
            tags,
          },
        }),
      );
    },
    setPlayerModelState: (playerModel) => {
      set((state) =>
        markDirtyState({
          playerModel,
          player: {
            ...state.player,
            profileTags: playerModel.tags,
          },
        }),
      );
    },
    setPlayerModelTags: (tags) => {
      set((state) =>
        markDirtyState({
          playerModel: {
            ...state.playerModel,
            tags,
          },
          player: {
            ...state.player,
            profileTags: tags,
          },
        }),
      );
    },
    appendRecentAreaVisit: (areaId) => {
      set((state) =>
        markDirtyState({
          playerModel: {
            ...state.playerModel,
            recentAreaVisits: [...state.playerModel.recentAreaVisits, areaId],
          },
        }),
      );
    },
    appendRecentQuestChoice: (choiceId) => {
      set((state) =>
        markDirtyState({
          playerModel: {
            ...state.playerModel,
            recentQuestChoices: [...state.playerModel.recentQuestChoices, choiceId],
          },
        }),
      );
    },

    setCombatEncounters: (encounters) => {
      set(
        markDirtyState({
          combatEncountersById: toEntityMap(encounters, (encounter) => encounter.id),
          combatEncounterOrder: encounters.map((encounter) => encounter.id),
        }),
      );
    },
    setCombatState: (combatState) => {
      set(markDirtyState({ combatState }));
    },
    clearCombatState: () => {
      set(markDirtyState({ combatState: null }));
    },
    setCombatHistory: (combatHistory) => {
      set(markDirtyState({ combatHistory }));
    },
    appendCombatHistory: (entry) => {
      set((state) =>
        markDirtyState({
          combatHistory: [...state.combatHistory, entry],
        }),
      );
    },

    setWorldEvents: (events) => {
      set(
        markDirtyState({
          eventDefinitionsById: toEntityMap(events, (event) => event.id),
          eventDefinitionOrder: events.map((event) => event.id),
        }),
      );
    },
    appendEventHistory: (entry) => {
      set((state) =>
        markDirtyState({
          eventHistory: [...state.eventHistory, entry],
        }),
      );
    },
    setEventDirector: (eventDirector) => {
      set(markDirtyState({ eventDirector }));
    },
    setPendingEventIds: (eventIds) => {
      set((state) =>
        markDirtyState({
          eventDirector: {
            ...state.eventDirector,
            pendingEventIds: uniqueIds(eventIds),
          },
        }),
      );
    },
    clearPendingEventIds: () => {
      set((state) =>
        markDirtyState({
          eventDirector: {
            ...state.eventDirector,
            pendingEventIds: [],
          },
        }),
      );
    },
    setWorldTension: (worldTension) => {
      set((state) =>
        markDirtyState({
          eventDirector: {
            ...state.eventDirector,
            worldTension,
          },
        }),
      );
    },

    setReviewState: (reviewState) => {
      set(markDirtyState({ reviewState }));
    },
    setCurrentReview: (review) => {
      set((state) =>
        markDirtyState({
          reviewState: {
            ...state.reviewState,
            current: review,
          },
        }),
      );
    },
    appendReviewHistory: (review) => {
      set((state) =>
        markDirtyState({
          reviewState: {
            current: review,
            history: [...state.reviewState.history, review],
          },
        }),
      );
    },

    setGameConfig: (gameConfig) => {
      set(markDirtyState({ gameConfig }));
    },
    patchGameConfig: (configPatch) => {
      set((state) =>
        markDirtyState({
          gameConfig: {
            ...state.gameConfig,
            ...configPatch,
          },
        }),
      );
    },
    setResourceState: (resourceState) => {
      set(markDirtyState({ resourceState }));
    },
    setLoadedResourceKeys: (resourceKeys) => {
      set((state) =>
        markDirtyState({
          resourceState: {
            ...state.resourceState,
            loadedResourceKeys: uniqueIds(resourceKeys),
          },
        }),
      );
    },

    setSaveMetadata: (saveMetadata) => {
      set({ saveMetadata });
    },
    setSaveStatus: (saveStatus) => {
      set({ saveStatus });
    },
    setLastLoadState: (lastLoadState) => {
      set({ lastLoadState });
    },
    setStartupState: (startupSource, startupReason) => {
      set({ startupSource, startupReason });
    },
    setAvailableSaveSlots: (availableSaveSlots) => {
      set({ availableSaveSlots });
    },
    setRecoveryNotice: (recoveryNotice) => {
      set({ recoveryNotice });
    },

    setUiState: (ui) => {
      set({ ui });
    },
    setActivePanel: (activePanel) => {
      set((state) => ({
        ui: {
          ...state.ui,
          activePanel,
        },
      }));
    },
    setSelectedNpcId: (selectedNpcId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedNpcId,
        },
      }));
    },
    setSelectedQuestId: (selectedQuestId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedQuestId,
        },
      }));
    },
    setSelectedAreaId: (selectedAreaId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedAreaId,
        },
      }));
    },
    setSelectedEventId: (selectedEventId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedEventId,
        },
      }));
    },
    setDebugOverlayOpen: (isDebugOverlayOpen) => {
      set((state) => ({
        ui: {
          ...state.ui,
          isDebugOverlayOpen,
        },
      }));
    },
    setDebugToolsState: (debugTools) => {
      set({ debugTools });
    },
    patchDebugToolsState: (debugPatch) => {
      set((state) => ({
        debugTools: {
          ...state.debugTools,
          ...debugPatch,
        },
      }));
    },
    setAppSessionState: (appSession) => {
      set({ appSession });
    },
    appendRouteHistory: (routeId) => {
      set((state) => ({
        appSession: {
          ...state.appSession,
          lastVisitedRouteId: routeId,
          routeHistory: [...state.appSession.routeHistory, routeId],
        },
      }));
    },
    touchSessionActivity: (timestamp) => {
      set((state) => ({
        appSession: {
          ...state.appSession,
          lastActiveAt: timestamp,
        },
      }));
    },
    resetUiState: () => {
      set({
        ui: defaultUiState(),
        debugTools: defaultDebugToolsState(),
        appSession: defaultAppSessionState(),
      });
    },
    hydrateFromSessionSnapshot: (snapshot) => {
      const parsedSnapshot = normalizeSessionSnapshot(snapshot);
      set({
        ui: parsedSnapshot.ui,
        debugTools: parsedSnapshot.debug,
        appSession: parsedSnapshot.session,
      });
    },
    exportSessionSnapshot: () => buildSessionSnapshotFromState(get()),

    hydrateFromSnapshot: (snapshot) => {
      const hydratedData = buildHydratedGameData(snapshot);
      set(hydratedData);
    },
    exportSaveSnapshot: (metadataOverrides) =>
      buildSaveSnapshotFromState(get(), metadataOverrides),
    resetToMockSnapshot: () => {
      set({
        ...buildHydratedGameData(mockSaveSnapshot),
        ui: defaultUiState(),
        debugTools: defaultDebugToolsState(),
        appSession: defaultAppSessionState(),
      });
    },
  }));
};

export const gameStore = createGameStore();

export const useGameStore = <T>(
  selector: (state: GameStoreState) => T,
) => useStore(gameStore, selector);

export const selectWorldDefinition = (state: GameStoreState) =>
  state.worldDefinition;
export const selectWorldRuntime = (state: GameStoreState) => state.worldRuntime;
export const selectWorld = (state: GameStoreState) =>
  buildWorldFromSlices(state.worldDefinition, state.worldRuntime);
export const selectWorldSummary = (state: GameStoreState) =>
  state.worldDefinition.summary;
export const selectWorldFlags = (state: GameStoreState) =>
  state.worldRuntime.flags;

export const selectAreas = (state: GameStoreState) =>
  state.areaOrder.map((areaId) => state.areasById[areaId]);
export const selectMapState = (state: GameStoreState) => state.mapState;
export const selectCurrentAreaId = (state: GameStoreState) =>
  state.mapState.currentAreaId;
export const selectCurrentArea = (state: GameStoreState) =>
  state.areasById[state.mapState.currentAreaId] ?? null;
export const selectUnlockedAreaIds = (state: GameStoreState) =>
  state.mapState.unlockedAreaIds;
export const selectDiscoveredAreaIds = (state: GameStoreState) =>
  state.mapState.discoveredAreaIds;
export const makeSelectAreaById =
  (areaId: string) =>
  (state: GameStoreState): Area | null =>
    state.areasById[areaId] ?? null;

export const selectQuestDefinitions = (state: GameStoreState) =>
  state.questDefinitionOrder.map((questId) => state.questDefinitionsById[questId]);
export const selectQuestProgressEntries = (state: GameStoreState) =>
  state.questProgressOrder.map((questId) => state.questProgressById[questId]);
export const selectActiveQuestProgress = (state: GameStoreState) =>
  selectQuestProgressEntries(state).filter((progress) => progress.status === 'active');
export const selectQuestHistory = (state: GameStoreState) => state.questHistory;
export const makeSelectQuestDefinitionById =
  (questId: string) =>
  (state: GameStoreState): QuestDefinition | null =>
    state.questDefinitionsById[questId] ?? null;
export const makeSelectQuestProgressById =
  (questId: string) =>
  (state: GameStoreState): QuestProgress | null =>
    state.questProgressById[questId] ?? null;

export const selectNpcDefinitions = (state: GameStoreState) =>
  state.npcDefinitionOrder.map((npcId) => state.npcDefinitionsById[npcId]);
export const selectNpcStates = (state: GameStoreState) =>
  state.npcStateOrder.map((npcId) => state.npcStatesById[npcId]);
export const makeSelectNpcDefinitionById =
  (npcId: string) =>
  (state: GameStoreState): NpcDefinition | null =>
    state.npcDefinitionsById[npcId] ?? null;
export const makeSelectNpcStateById =
  (npcId: string) =>
  (state: GameStoreState): NpcState | null =>
    state.npcStatesById[npcId] ?? null;

export const selectPlayerState = (state: GameStoreState) => state.player;
export const selectPlayerModelState = (state: GameStoreState) =>
  state.playerModel;
export const selectPlayerTags = (state: GameStoreState) =>
  state.playerModel.tags;

export const selectCombatEncounters = (state: GameStoreState) =>
  state.combatEncounterOrder.map(
    (encounterId) => state.combatEncountersById[encounterId],
  );
export const selectCombatState = (state: GameStoreState) => state.combatState;
export const selectCombatHistory = (state: GameStoreState) => state.combatHistory;
export const makeSelectCombatEncounterById =
  (encounterId: string) =>
  (state: GameStoreState): CombatEncounterDefinition | null =>
    state.combatEncountersById[encounterId] ?? null;

export const selectEventDefinitions = (state: GameStoreState) =>
  state.eventDefinitionOrder.map((eventId) => state.eventDefinitionsById[eventId]);
export const selectEventHistory = (state: GameStoreState) => state.eventHistory;
export const selectEventDirector = (state: GameStoreState) => state.eventDirector;
export const selectPendingEventIds = (state: GameStoreState) =>
  state.eventDirector.pendingEventIds;

export const selectReviewState = (state: GameStoreState) => state.reviewState;
export const selectCurrentReview = (state: GameStoreState) =>
  state.reviewState.current;

export const selectGameConfig = (state: GameStoreState) => state.gameConfig;
export const selectResourceState = (state: GameStoreState) =>
  state.resourceState;

export const selectSaveMetadata = (state: GameStoreState) => state.saveMetadata;
export const selectSaveStatus = (state: GameStoreState) => state.saveStatus;
export const selectLastLoadState = (state: GameStoreState) =>
  state.lastLoadState;
export const selectStartupSource = (state: GameStoreState) =>
  state.startupSource;
export const selectStartupReason = (state: GameStoreState) =>
  state.startupReason;
export const selectAvailableSaveSlots = (state: GameStoreState) =>
  state.availableSaveSlots;
export const selectRecoveryNotice = (state: GameStoreState) =>
  state.recoveryNotice;

export const selectUiState = (state: GameStoreState) => state.ui;
export const selectActivePanel = (state: GameStoreState) => state.ui.activePanel;
export const selectDebugToolsState = (state: GameStoreState) =>
  state.debugTools;
export const selectAppSessionState = (state: GameStoreState) =>
  state.appSession;
