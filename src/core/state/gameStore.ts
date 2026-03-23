import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { mockSaveSnapshot } from '../mocks';
import { saveSnapshotSchema } from '../schemas';
import type {
  Area,
  CombatState,
  LoadFailureReason,
  NpcDefinition,
  NpcState,
  PlayerState,
  QuestDefinition,
  QuestProgress,
  SaveMetadata,
  SaveSnapshot,
  World,
  WorldEvent,
} from '../schemas';

type EntityMap<T> = Record<string, T>;
export type GameUiPanel = 'map' | 'npc' | 'quest' | 'combat' | 'review' | 'debug';
export type SaveLifecycleStatus = 'hydrated' | 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type StartupSource = 'pending' | 'save' | 'mock';
export type StartupReason =
  | 'booting'
  | 'save-restored'
  | 'no-save'
  | 'invalid-save'
  | 'storage-error';

export interface SaveLoadState {
  ok: boolean;
  reason?: LoadFailureReason;
}

export interface GameUiState {
  activePanel: GameUiPanel;
  selectedNpcId: string | null;
  selectedQuestId: string | null;
  selectedAreaId: string | null;
  isDebugOverlayOpen: boolean;
}

interface HydratedGameData {
  world: World;
  areasById: EntityMap<Area>;
  areaOrder: string[];
  currentAreaId: string;
  questDefinitionsById: EntityMap<QuestDefinition>;
  questDefinitionOrder: string[];
  questProgressById: EntityMap<QuestProgress>;
  questProgressOrder: string[];
  npcDefinitionsById: EntityMap<NpcDefinition>;
  npcDefinitionOrder: string[];
  npcStatesById: EntityMap<NpcState>;
  npcStateOrder: string[];
  player: PlayerState;
  combat: CombatState | null;
  eventDefinitionsById: EntityMap<WorldEvent>;
  eventDefinitionOrder: string[];
  eventHistory: SaveSnapshot['events']['history'];
  pendingEventIds: string[];
  saveMetadata: SaveMetadata;
  saveStatus: SaveLifecycleStatus;
  lastLoadState: SaveLoadState;
  startupSource: StartupSource;
  startupReason: StartupReason;
  ui: GameUiState;
}

export interface WorldSlice {
  world: World;
  setWorld: (world: World) => void;
  setWorldFlags: (flags: Partial<World['flags']>) => void;
  setWorldFlag: (flag: string, value: boolean) => void;
}

export interface AreaSlice {
  areasById: EntityMap<Area>;
  areaOrder: string[];
  currentAreaId: string;
  setAreas: (areas: Area[]) => void;
  setCurrentAreaId: (areaId: string) => void;
}

export interface QuestSlice {
  questDefinitionsById: EntityMap<QuestDefinition>;
  questDefinitionOrder: string[];
  questProgressById: EntityMap<QuestProgress>;
  questProgressOrder: string[];
  setQuestDefinitions: (definitions: QuestDefinition[]) => void;
  setQuestProgress: (progressEntries: QuestProgress[]) => void;
  upsertQuestProgress: (progress: QuestProgress) => void;
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
  setPlayerState: (player: PlayerState) => void;
  setPlayerTags: (tags: PlayerState['profileTags']) => void;
}

export interface CombatSlice {
  combat: CombatState | null;
  setCombatState: (combat: CombatState | null) => void;
  clearCombatState: () => void;
}

export interface EventSlice {
  eventDefinitionsById: EntityMap<WorldEvent>;
  eventDefinitionOrder: string[];
  eventHistory: SaveSnapshot['events']['history'];
  pendingEventIds: string[];
  setWorldEvents: (events: WorldEvent[]) => void;
  appendEventHistory: (entry: SaveSnapshot['events']['history'][number]) => void;
  setPendingEventIds: (eventIds: string[]) => void;
  clearPendingEventIds: () => void;
}

export interface SaveSlice {
  saveMetadata: SaveMetadata;
  saveStatus: SaveLifecycleStatus;
  lastLoadState: SaveLoadState;
  startupSource: StartupSource;
  startupReason: StartupReason;
  setSaveMetadata: (metadata: SaveMetadata) => void;
  setSaveStatus: (status: SaveLifecycleStatus) => void;
  setLastLoadState: (state: SaveLoadState) => void;
  setStartupState: (source: StartupSource, reason: StartupReason) => void;
}

export interface UiSlice {
  ui: GameUiState;
  setActivePanel: (panel: GameUiPanel) => void;
  setSelectedNpcId: (npcId: string | null) => void;
  setSelectedQuestId: (questId: string | null) => void;
  setSelectedAreaId: (areaId: string | null) => void;
  setDebugOverlayOpen: (isOpen: boolean) => void;
  resetUiState: () => void;
}

export interface GameStoreActions {
  hydrateFromSnapshot: (snapshot: SaveSnapshot) => void;
  exportSaveSnapshot: (metadataOverrides?: Partial<SaveMetadata>) => SaveSnapshot;
  resetToMockSnapshot: () => void;
}

export type GameStoreState = WorldSlice &
  AreaSlice &
  QuestSlice &
  NpcSlice &
  PlayerSlice &
  CombatSlice &
  EventSlice &
  SaveSlice &
  UiSlice &
  GameStoreActions;

const defaultUiState = (): GameUiState => ({
  activePanel: 'map',
  selectedNpcId: null,
  selectedQuestId: null,
  selectedAreaId: null,
  isDebugOverlayOpen: false,
});

const toEntityMap = <T>(
  items: T[],
  getKey: (item: T) => string,
): EntityMap<T> =>
  items.reduce<EntityMap<T>>((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});

const markDirtyState = <T extends object>(partial: T): T & Pick<SaveSlice, 'saveStatus'> => ({
  ...partial,
  saveStatus: 'dirty',
});

const sanitizeFlagUpdates = (flags: Partial<World['flags']>): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(flags).filter((entry): entry is [string, boolean] => entry[1] !== undefined),
  );

const normalizeSnapshot = (snapshot: SaveSnapshot): SaveSnapshot => saveSnapshotSchema.parse(snapshot);

const buildHydratedGameData = (snapshot: SaveSnapshot): HydratedGameData => {
  const parsedSnapshot = normalizeSnapshot(snapshot);

  return {
    world: parsedSnapshot.world,
    areasById: toEntityMap(parsedSnapshot.areas, (area) => area.id),
    areaOrder: parsedSnapshot.areas.map((area) => area.id),
    currentAreaId: parsedSnapshot.player.currentAreaId,
    questDefinitionsById: toEntityMap(parsedSnapshot.quests.definitions, (quest) => quest.id),
    questDefinitionOrder: parsedSnapshot.quests.definitions.map((quest) => quest.id),
    questProgressById: toEntityMap(parsedSnapshot.quests.progress, (progress) => progress.questId),
    questProgressOrder: parsedSnapshot.quests.progress.map((progress) => progress.questId),
    npcDefinitionsById: toEntityMap(parsedSnapshot.npcs.definitions, (npc) => npc.id),
    npcDefinitionOrder: parsedSnapshot.npcs.definitions.map((npc) => npc.id),
    npcStatesById: toEntityMap(parsedSnapshot.npcs.runtime, (npcState) => npcState.npcId),
    npcStateOrder: parsedSnapshot.npcs.runtime.map((npcState) => npcState.npcId),
    player: parsedSnapshot.player,
    combat: parsedSnapshot.combat ?? null,
    eventDefinitionsById: toEntityMap(parsedSnapshot.events.definitions, (event) => event.id),
    eventDefinitionOrder: parsedSnapshot.events.definitions.map((event) => event.id),
    eventHistory: parsedSnapshot.events.history,
    pendingEventIds: [],
    saveMetadata: parsedSnapshot.metadata,
    saveStatus: 'hydrated',
    lastLoadState: {
      ok: true,
    },
    startupSource: 'pending',
    startupReason: 'booting',
    ui: defaultUiState(),
  };
};

const buildSaveSnapshotFromState = (
  state: Pick<
    GameStoreState,
    | 'world'
    | 'areasById'
    | 'areaOrder'
    | 'currentAreaId'
    | 'questDefinitionsById'
    | 'questDefinitionOrder'
    | 'questProgressById'
    | 'questProgressOrder'
    | 'npcDefinitionsById'
    | 'npcDefinitionOrder'
    | 'npcStatesById'
    | 'npcStateOrder'
    | 'player'
    | 'combat'
    | 'eventDefinitionsById'
    | 'eventDefinitionOrder'
    | 'eventHistory'
    | 'saveMetadata'
  >,
  metadataOverrides?: Partial<SaveMetadata>,
): SaveSnapshot => {
  const snapshot: SaveSnapshot = {
    metadata: {
      ...state.saveMetadata,
      ...metadataOverrides,
    },
    world: state.world,
    areas: state.areaOrder.map((areaId) => state.areasById[areaId]),
    quests: {
      definitions: state.questDefinitionOrder.map((questId) => state.questDefinitionsById[questId]),
      progress: state.questProgressOrder.map((questId) => state.questProgressById[questId]),
    },
    npcs: {
      definitions: state.npcDefinitionOrder.map((npcId) => state.npcDefinitionsById[npcId]),
      runtime: state.npcStateOrder.map((npcId) => state.npcStatesById[npcId]),
    },
    player: {
      ...state.player,
      currentAreaId: state.currentAreaId,
    },
    events: {
      definitions: state.eventDefinitionOrder.map((eventId) => state.eventDefinitionsById[eventId]),
      history: state.eventHistory,
    },
    combat: state.combat,
    review: null,
  };

  return normalizeSnapshot(snapshot);
};

export const createGameStore = (initialSnapshot: SaveSnapshot = mockSaveSnapshot) => {
  const initialData = buildHydratedGameData(initialSnapshot);

  return createStore<GameStoreState>()((set, get) => ({
    ...initialData,

    setWorld: (world) => {
      set(markDirtyState({ world }));
    },
    setWorldFlags: (flags) => {
      set((state) =>
        markDirtyState({
          world: {
            ...state.world,
            flags: {
              ...state.world.flags,
              ...sanitizeFlagUpdates(flags),
            },
          },
        }),
      );
    },
    setWorldFlag: (flag, value) => {
      set((state) =>
        markDirtyState({
          world: {
            ...state.world,
            flags: {
              ...state.world.flags,
              [flag]: value,
            },
          },
        }),
      );
    },

    setAreas: (areas) => {
      set(markDirtyState({ areasById: toEntityMap(areas, (area) => area.id), areaOrder: areas.map((area) => area.id) }));
    },
    setCurrentAreaId: (areaId) => {
      set((state) =>
        markDirtyState({
          currentAreaId: areaId,
          player: {
            ...state.player,
            currentAreaId: areaId,
          },
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
          npcStateOrder: hasNpcState ? state.npcStateOrder : [...state.npcStateOrder, npcState.npcId],
        });
      });
    },

    setPlayerState: (player) => {
      set(
        markDirtyState({
          player,
          currentAreaId: player.currentAreaId,
        }),
      );
    },
    setPlayerTags: (tags) => {
      set((state) =>
        markDirtyState({
          player: {
            ...state.player,
            profileTags: tags,
          },
        }),
      );
    },

    setCombatState: (combat) => {
      set(markDirtyState({ combat }));
    },
    clearCombatState: () => {
      set(markDirtyState({ combat: null }));
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
    setPendingEventIds: (eventIds) => {
      set(markDirtyState({ pendingEventIds: eventIds }));
    },
    clearPendingEventIds: () => {
      set(markDirtyState({ pendingEventIds: [] }));
    },

    setSaveMetadata: (metadata) => {
      set({ saveMetadata: metadata });
    },
    setSaveStatus: (status) => {
      set({ saveStatus: status });
    },
    setLastLoadState: (lastLoadState) => {
      set({ lastLoadState });
    },
    setStartupState: (startupSource, startupReason) => {
      set({ startupSource, startupReason });
    },

    setActivePanel: (panel) => {
      set((state) => ({
        ui: {
          ...state.ui,
          activePanel: panel,
        },
      }));
    },
    setSelectedNpcId: (npcId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedNpcId: npcId,
        },
      }));
    },
    setSelectedQuestId: (questId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedQuestId: questId,
        },
      }));
    },
    setSelectedAreaId: (areaId) => {
      set((state) => ({
        ui: {
          ...state.ui,
          selectedAreaId: areaId,
        },
      }));
    },
    setDebugOverlayOpen: (isOpen) => {
      set((state) => ({
        ui: {
          ...state.ui,
          isDebugOverlayOpen: isOpen,
        },
      }));
    },
    resetUiState: () => {
      set({ ui: defaultUiState() });
    },

    hydrateFromSnapshot: (snapshot) => {
      const hydratedData = buildHydratedGameData(snapshot);
      set(hydratedData);
    },
    exportSaveSnapshot: (metadataOverrides) => buildSaveSnapshotFromState(get(), metadataOverrides),
    resetToMockSnapshot: () => {
      set(buildHydratedGameData(mockSaveSnapshot));
    },
  }));
};

export const gameStore = createGameStore();

export const useGameStore = <T>(selector: (state: GameStoreState) => T) => useStore(gameStore, selector);

export const selectWorld = (state: GameStoreState) => state.world;
export const selectWorldSummary = (state: GameStoreState) => state.world.summary;
export const selectWorldFlags = (state: GameStoreState) => state.world.flags;
export const selectAreas = (state: GameStoreState) =>
  state.areaOrder.map((areaId) => state.areasById[areaId]);
export const selectCurrentAreaId = (state: GameStoreState) => state.currentAreaId;
export const selectCurrentArea = (state: GameStoreState) =>
  state.areasById[state.currentAreaId] ?? null;
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
export const selectPlayerTags = (state: GameStoreState) => state.player.profileTags;
export const selectCombatState = (state: GameStoreState) => state.combat;
export const selectEventDefinitions = (state: GameStoreState) =>
  state.eventDefinitionOrder.map((eventId) => state.eventDefinitionsById[eventId]);
export const selectEventHistory = (state: GameStoreState) => state.eventHistory;
export const selectPendingEventIds = (state: GameStoreState) => state.pendingEventIds;
export const selectSaveMetadata = (state: GameStoreState) => state.saveMetadata;
export const selectSaveStatus = (state: GameStoreState) => state.saveStatus;
export const selectLastLoadState = (state: GameStoreState) => state.lastLoadState;
export const selectStartupSource = (state: GameStoreState) => state.startupSource;
export const selectStartupReason = (state: GameStoreState) => state.startupReason;
export const selectUiState = (state: GameStoreState) => state.ui;
export const selectActivePanel = (state: GameStoreState) => state.ui.activePanel;
