import {
  areaSceneStageModelSchema,
  type AreaSceneMarker,
  type AreaSceneStageModel,
  type AreaSceneTile,
} from '../../components/map/areaSceneStage.contract';
import type { GameLogRecord } from '../../core/logging/logTypes';
import {
  evaluateAreaAccess,
  isAreaVisibleInNavigation,
  resolveAreaEnvironmentState,
} from '../../core/rules';
import type {
  Area,
  CombatEncounterDefinition,
  CombatState,
  EventDirectorState,
  EventLogEntry,
  NpcDefinition,
  NpcState,
  PlayerModelState,
  PlayerState,
  QuestDefinition,
  QuestProgress,
  ReviewPayload,
  SaveMetadata,
  World,
  WorldEvent,
} from '../../core/schemas';
import type { SaveLifecycleStatus } from '../../core/state';

export interface GamePageViewModelSource {
  worldSummary: World['summary'];
  worldRuntime: Pick<World, 'weather' | 'timeOfDay'>;
  worldFlags: World['flags'];
  currentArea: Area | null;
  areas: Area[];
  mapState: {
    currentAreaId: string;
    discoveredAreaIds: string[];
    unlockedAreaIds: string[];
    visitHistory: string[];
  };
  questDefinitions: QuestDefinition[];
  questProgressEntries: QuestProgress[];
  npcDefinitions: NpcDefinition[];
  npcStates: NpcState[];
  player: PlayerState;
  playerModel: PlayerModelState;
  combatEncounters: CombatEncounterDefinition[];
  combatState: CombatState | null;
  eventDefinitions: WorldEvent[];
  eventHistory: EventLogEntry[];
  eventDirector: EventDirectorState;
  review: ReviewPayload | null;
  saveMetadata: SaveMetadata;
  saveStatus: SaveLifecycleStatus;
  logEntries: GameLogRecord[];
}

export interface GamePageViewModel {
  topBar: {
    worldName: string;
    worldSubtitle?: string;
    currentArea: string;
    areaType: string;
    timeWeather: string;
    saveStatus: string;
    saveDetail: string;
    saveTone: 'default' | 'success' | 'warning' | 'info';
  };
  leftSidebar: {
    areas: Array<{
      id: string;
      name: string;
      status: string;
      isCurrent: boolean;
      isDiscovered: boolean;
      isUnlocked: boolean;
      isConnected: boolean;
    }>;
    progressPercent: number;
    progressMetrics: Array<{ label: string; value: string }>;
    areaSummary: string;
  };
  scene: {
    areaName: string;
    areaType: string;
    description: string;
    sceneStatus: string;
    stage: AreaSceneStageModel;
    npcs: Array<{
      id: string;
      name: string;
      role: string;
      disposition: string;
      trust: number;
      relationship: number;
    }>;
    events: Array<{
      id: string;
      title: string;
      detail: string;
      isPending: boolean;
      isTriggered: boolean;
    }>;
  };
  rightSidebar: {
    quests: Array<{
      id: string;
      title: string;
      status: string;
      objective: string;
      progress: string;
    }>;
    inventory: Array<{
      id: string;
      label: string;
      quantity: number;
    }>;
    playerStatus: Array<{ label: string; value: string }>;
    playerTags: string[];
    relationships: Array<{
      id: string;
      name: string;
      trust: number;
      relationship: number;
      disposition: string;
    }>;
    enemyAlerts: Array<{
      id: string;
      label: string;
      detail: string;
      tone: 'default' | 'success' | 'warning' | 'info';
    }>;
  };
  logs: Array<{
    id: string;
    label: string;
    detail: string;
    meta: string;
    tone: 'default' | 'success' | 'warning' | 'info';
    emphasis: 'default' | 'recent' | 'highlight';
  }>;
  tips: Array<{
    id: string;
    title: string;
    summary: string;
    tone: 'default' | 'success' | 'warning' | 'info';
  }>;
}

const humanizeToken = (value: string | undefined) => {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/^[^:]+:/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatSaveStatus = (
  saveStatus: SaveLifecycleStatus,
): {
  label: string;
  tone: 'default' | 'success' | 'warning' | 'info';
} => {
  switch (saveStatus) {
    case 'saved':
      return { label: 'Saved', tone: 'success' };
    case 'saving':
      return { label: 'Saving', tone: 'info' };
    case 'error':
      return { label: 'Save Error', tone: 'warning' };
    case 'dirty':
      return { label: 'Unsaved Changes', tone: 'warning' };
    case 'hydrated':
      return { label: 'Loaded', tone: 'info' };
    default:
      return { label: 'Idle', tone: 'default' };
  }
};

const formatIsoSummary = (value: string | undefined) =>
  value ? value.replace('T', ' · ').slice(0, 16) : 'No save timestamp';

const toPercent = (current: number, total: number) =>
  total === 0 ? 0 : Math.round((current / total) * 100);

const clampPercent = (value: number) => Math.max(8, Math.min(92, value));

const buildSceneTile = (
  id: string,
  label: string,
  variant: string,
  tone: AreaSceneTile['tone'],
  xPercent: number,
  yPercent: number,
  widthPercent: number,
  heightPercent: number,
  animation: AreaSceneTile['animation'] = 'none',
): AreaSceneTile => ({
  id,
  label,
  variant,
  tone,
  animation,
  xPercent,
  yPercent,
  widthPercent,
  heightPercent,
});

const buildLayer = (
  id: string,
  label: string,
  detail: string,
  kind: 'background' | 'terrain' | 'structures' | 'highlights',
  tiles: AreaSceneTile[],
): AreaSceneStageModel['layers'][number] => ({
  id,
  label,
  detail,
  kind,
  tiles,
});

type SceneBlueprint = {
  background: AreaSceneTile[];
  terrain: AreaSceneTile[];
  structures: AreaSceneTile[];
  highlights: AreaSceneTile[];
};

const sceneBlueprints: Partial<Record<Area['type'], SceneBlueprint>> = {
  town: {
    background: [
      buildSceneTile('background:sky', 'Town skyline', 'sky', 'info', 0, 0, 100, 46, 'shimmer'),
      buildSceneTile('background:mist', 'Market mist', 'mist', 'default', 0, 26, 100, 24, 'float'),
    ],
    terrain: [
      buildSceneTile('terrain:courtyard', 'Courtyard floor', 'ground', 'default', 0, 58, 100, 42),
      buildSceneTile('terrain:path', 'Main route', 'path', 'warning', 16, 66, 66, 14, 'shimmer'),
      buildSceneTile('terrain:canal', 'Reflective canal', 'water', 'info', 72, 72, 16, 16, 'pulse'),
    ],
    structures: [
      buildSceneTile('structure:roof-west', 'Roofline west', 'roof', 'warning', 10, 36, 26, 20),
      buildSceneTile('structure:tower-east', 'Watchtower east', 'tower', 'info', 64, 25, 18, 34),
      buildSceneTile('structure:stall-center', 'Merchant stalls', 'arch', 'success', 44, 46, 20, 14),
    ],
    highlights: [
      buildSceneTile('highlight:beacon', 'Cartography beacon', 'beacon', 'info', 11, 28, 12, 16, 'pulse'),
      buildSceneTile('highlight:signal', 'Guide signal', 'signal', 'success', 48, 42, 12, 10, 'flicker'),
    ],
  },
  shop: {
    background: [
      buildSceneTile('background:sky', 'Bazaar skyline', 'sky', 'info', 0, 0, 100, 46, 'shimmer'),
      buildSceneTile('background:mist', 'Lantern haze', 'mist', 'default', 0, 28, 100, 22, 'float'),
    ],
    terrain: [
      buildSceneTile('terrain:market', 'Market ground', 'ground', 'default', 0, 58, 100, 42),
      buildSceneTile('terrain:aisle', 'Trade aisle', 'path', 'warning', 22, 66, 56, 14, 'shimmer'),
    ],
    structures: [
      buildSceneTile('structure:booths', 'Booth row', 'roof', 'warning', 18, 38, 26, 18),
      buildSceneTile('structure:stall-east', 'Merchant stand', 'arch', 'success', 56, 44, 18, 14),
    ],
    highlights: [
      buildSceneTile('highlight:coin-light', 'Trade shimmer', 'glow', 'info', 50, 44, 12, 12, 'shimmer'),
    ],
  },
  wilderness: {
    background: [
      buildSceneTile('background:sky', 'Forest canopy sky', 'sky', 'info', 0, 0, 100, 44, 'shimmer'),
      buildSceneTile('background:fog', 'Roving fog', 'mist', 'default', 0, 28, 100, 26, 'float'),
    ],
    terrain: [
      buildSceneTile('terrain:meadow', 'Meadow floor', 'ground', 'success', 0, 56, 100, 44),
      buildSceneTile('terrain:stream', 'Stream bend', 'water', 'info', 16, 72, 20, 16, 'shimmer'),
      buildSceneTile('terrain:trail', 'Trail branch', 'path', 'warning', 42, 60, 18, 30),
      buildSceneTile('terrain:grove', 'Dense grove', 'foliage', 'success', 72, 54, 18, 20, 'float'),
    ],
    structures: [
      buildSceneTile('structure:arch-west', 'Stone arch', 'arch', 'default', 8, 40, 18, 18),
      buildSceneTile('structure:perch-east', 'Watch perch', 'tower', 'info', 62, 34, 16, 28),
    ],
    highlights: [
      buildSceneTile('highlight:glade', 'Glade shimmer', 'glow', 'info', 28, 48, 14, 12, 'shimmer'),
      buildSceneTile('highlight:path-signal', 'Trail signal', 'signal', 'success', 51, 48, 12, 10, 'flicker'),
    ],
  },
  hidden: {
    background: [
      buildSceneTile('background:sky', 'Hidden sky', 'sky', 'info', 0, 0, 100, 44, 'shimmer'),
      buildSceneTile('background:fog', 'Hidden veil', 'mist', 'default', 0, 30, 100, 24, 'float'),
    ],
    terrain: [
      buildSceneTile('terrain:clearing', 'Hidden clearing', 'ground', 'success', 0, 58, 100, 42),
      buildSceneTile('terrain:trail', 'Secret trail', 'path', 'warning', 20, 64, 54, 14),
      buildSceneTile('terrain:grove', 'Ancient grove', 'foliage', 'success', 68, 52, 18, 22, 'float'),
    ],
    structures: [
      buildSceneTile('structure:arch', 'Hidden arch', 'arch', 'default', 20, 34, 20, 18),
    ],
    highlights: [
      buildSceneTile('highlight:glow', 'Secret glow', 'glow', 'info', 44, 42, 16, 16, 'shimmer'),
    ],
  },
  dungeon: {
    background: [
      buildSceneTile('background:void', 'Shadowed vault', 'mist', 'default', 0, 0, 100, 52, 'float'),
      buildSceneTile('background:rune-glow', 'Rune wash', 'glow', 'warning', 10, 8, 80, 24, 'shimmer'),
    ],
    terrain: [
      buildSceneTile('terrain:stone', 'Stone floor', 'stone', 'default', 0, 56, 100, 44),
      buildSceneTile('terrain:walkway', 'Dungeon walkway', 'path', 'warning', 20, 68, 60, 12),
      buildSceneTile('terrain:rift', 'Arcane rift', 'water', 'info', 72, 60, 14, 18, 'pulse'),
    ],
    structures: [
      buildSceneTile('structure:gate', 'Ritual gate', 'wall', 'warning', 36, 30, 28, 24),
      buildSceneTile('structure:spire', 'Broken spire', 'tower', 'info', 72, 22, 12, 34),
    ],
    highlights: [
      buildSceneTile('highlight:ritual', 'Ritual halo', 'beacon', 'warning', 42, 36, 16, 16, 'pulse'),
    ],
  },
  ruin: {
    background: [
      buildSceneTile('background:void', 'Ruin haze', 'mist', 'default', 0, 0, 100, 52, 'float'),
      buildSceneTile('background:rune-glow', 'Old glow', 'glow', 'warning', 14, 10, 72, 22, 'shimmer'),
    ],
    terrain: [
      buildSceneTile('terrain:stone', 'Crumbling stone', 'stone', 'default', 0, 56, 100, 44),
      buildSceneTile('terrain:walkway', 'Collapsed route', 'path', 'warning', 18, 68, 58, 12),
    ],
    structures: [
      buildSceneTile('structure:wall', 'Broken wall', 'wall', 'warning', 18, 32, 20, 24),
      buildSceneTile('structure:arch', 'Ruin arch', 'arch', 'default', 56, 30, 16, 22),
    ],
    highlights: [
      buildSceneTile('highlight:glow', 'Ruin shimmer', 'glow', 'info', 50, 42, 14, 14, 'shimmer'),
    ],
  },
  boss: {
    background: [
      buildSceneTile('background:void', 'Boss vault', 'mist', 'default', 0, 0, 100, 52, 'float'),
      buildSceneTile('background:rune-glow', 'Boss aura', 'glow', 'warning', 8, 8, 84, 26, 'shimmer'),
    ],
    terrain: [
      buildSceneTile('terrain:stone', 'Boss floor', 'stone', 'default', 0, 56, 100, 44),
      buildSceneTile('terrain:walkway', 'Challenge lane', 'path', 'warning', 18, 68, 62, 12),
      buildSceneTile('terrain:rift', 'Threat rift', 'water', 'info', 70, 58, 16, 18, 'pulse'),
    ],
    structures: [
      buildSceneTile('structure:gate', 'Boss gate', 'wall', 'warning', 34, 30, 30, 24),
      buildSceneTile('structure:spire', 'Threat spire', 'tower', 'info', 74, 20, 12, 36),
    ],
    highlights: [
      buildSceneTile('highlight:ritual', 'Threat halo', 'beacon', 'warning', 42, 36, 16, 16, 'pulse'),
      buildSceneTile('highlight:signal', 'Boss signal', 'danger', 'warning', 64, 34, 16, 16, 'flicker'),
    ],
  },
};

const fallbackBlueprint: SceneBlueprint = {
  background: [
    buildSceneTile('background:sky', 'Fallback sky', 'sky', 'info', 0, 0, 100, 46, 'shimmer'),
  ],
  terrain: [
    buildSceneTile('terrain:ground', 'Fallback ground', 'ground', 'default', 0, 58, 100, 42),
  ],
  structures: [
    buildSceneTile('structure:arch', 'Fallback arch', 'arch', 'default', 30, 36, 26, 20),
  ],
  highlights: [
    buildSceneTile('highlight:ambient', 'Ambient stage glow', 'glow', 'info', 56, 38, 16, 16, 'shimmer'),
  ],
};

const stageLegend: AreaSceneStageModel['legend'] = [
  { id: 'legend:npc', label: 'NPC lane', tone: 'success' },
  { id: 'legend:portal', label: 'Portal route', tone: 'info' },
  { id: 'legend:item', label: 'Item pickup', tone: 'default' },
  { id: 'legend:battle', label: 'Battle alert', tone: 'warning' },
  { id: 'legend:event', label: 'Event trigger', tone: 'warning' },
];

const buildSceneLayers = (
  areaType: Area['type'] | undefined,
  pendingEventCount: number,
): AreaSceneStageModel['layers'] => {
  const blueprint = areaType ? sceneBlueprints[areaType] ?? fallbackBlueprint : fallbackBlueprint;
  const eventTile =
    pendingEventCount > 0
      ? buildSceneTile(
          'highlight:event-flare',
          'Live event flare',
          'danger',
          'warning',
          69,
          30,
          17,
          18,
          'pulse',
        )
      : null;

  return [
    buildLayer(
      'layer:background',
      'Background Layer',
      'Sky and mood placeholders compatible with later parallax rendering.',
      'background',
      blueprint.background,
    ),
    buildLayer(
      'layer:terrain',
      'Terrain Layer',
      'Ground, route, and floor massing isolated from structure art.',
      'terrain',
      blueprint.terrain,
    ),
    buildLayer(
      'layer:structures',
      'Structure Layer',
      'Buildings and silhouette props rendered on a separate sprite plane.',
      'structures',
      blueprint.structures,
    ),
    buildLayer(
      'layer:highlights',
      'Highlight Layer',
      'Signals and event emphasis stay decoupled from domain rules.',
      'highlights',
      eventTile ? [...blueprint.highlights, eventTile] : blueprint.highlights,
    ),
  ];
};

const logToneByKind: Record<GameLogRecord['kind'], 'default' | 'success' | 'warning' | 'info'> = {
  'agent-decision': 'info',
  combat: 'warning',
  'domain-event': 'info',
  'explanation-input': 'default',
  'npc-interaction': 'success',
  'save-load': 'success',
};

const markerGlyphByType: Record<Area['interactionPoints'][number]['type'], string> = {
  battle: 'ATK',
  event: 'EV',
  item: 'IT',
  npc: 'NPC',
  portal: 'GO',
  shop: 'SH',
};

interface MarkerAccessContext {
  currentArea: Area | null;
  areasById: Record<string, Area>;
  mapState: GamePageViewModelSource['mapState'];
  questProgressEntries: QuestProgress[];
  worldFlags: World['flags'];
  npcStatesById: Record<string, NpcState>;
}

const buildSceneMarker = (
  point: Area['interactionPoints'][number],
  maxX: number,
  maxY: number,
  pendingEventIds: string[],
  accessContext: MarkerAccessContext,
): AreaSceneMarker => {
  const isPendingEvent =
    point.type === 'event' &&
    pendingEventIds.includes(point.targetId ?? point.id);
  const targetArea =
    point.type === 'portal' && point.targetId
      ? accessContext.areasById[point.targetId]
      : null;
  const isPortalAccessible =
    point.type !== 'portal' || !targetArea
      ? point.enabled !== false
      : (point.enabled ?? true) &&
        evaluateAreaAccess({
          currentArea: accessContext.currentArea,
          targetArea,
          unlockedAreaIds: accessContext.mapState.unlockedAreaIds,
          questProgress: accessContext.questProgressEntries,
          worldFlags: accessContext.worldFlags,
          npcStatesById: accessContext.npcStatesById,
        }).ok;
  const isHiddenRoute =
    targetArea &&
    (targetArea.isHiddenUntilDiscovered ?? targetArea.type === 'hidden') &&
    !accessContext.mapState.discoveredAreaIds.includes(targetArea.id);
  const portalGlyph = point.travelMode === 'teleport' ? 'TP' : 'GO';

  if (point.type === 'portal' && !isPortalAccessible) {
    return {
      id: point.id,
      label: point.label,
      caption:
        point.travelMode === 'teleport'
          ? 'Locked teleport'
          : isHiddenRoute
            ? 'Hidden route sealed'
            : 'Locked route',
      glyph: portalGlyph,
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      xPercent: clampPercent((point.x / maxX) * 100),
      yPercent: clampPercent((point.y / maxY) * 100),
      feedbackTone: 'default',
      state: 'disabled',
    };
  }

  if (point.enabled === false) {
    return {
      id: point.id,
      label: point.label,
      caption: 'Offline node',
      glyph: point.type === 'portal' ? portalGlyph : markerGlyphByType[point.type],
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      xPercent: clampPercent((point.x / maxX) * 100),
      yPercent: clampPercent((point.y / maxY) * 100),
      feedbackTone: 'default',
      state: 'disabled',
    };
  }

  const baseMarker = {
    id: point.id,
    label: point.label,
    glyph: point.type === 'portal' ? portalGlyph : markerGlyphByType[point.type],
    typeLabel: humanizeToken(point.type),
    type: point.type,
    targetId: point.targetId,
    enabled: true,
    xPercent: clampPercent((point.x / maxX) * 100),
    yPercent: clampPercent((point.y / maxY) * 100),
  } as const;

  switch (point.type) {
    case 'npc':
      return { ...baseMarker, caption: 'Talk / trust', feedbackTone: 'success', state: 'focus' };
    case 'shop':
      return { ...baseMarker, caption: 'Trade lane', feedbackTone: 'success', state: 'focus' };
    case 'portal':
      return {
        ...baseMarker,
        caption:
          point.travelMode === 'teleport'
            ? 'Teleport point'
            : isHiddenRoute
              ? 'Hidden route'
              : 'Area route',
        feedbackTone: point.travelMode === 'teleport' ? 'warning' : 'info',
        state: 'focus',
      };
    case 'battle':
      return { ...baseMarker, caption: 'Engage battle', feedbackTone: 'warning', state: 'alert' };
    case 'event':
      return {
        ...baseMarker,
        caption: isPendingEvent ? 'Pending trigger' : 'World event',
        feedbackTone: isPendingEvent ? 'warning' : 'info',
        state: isPendingEvent ? 'alert' : 'focus',
      };
    case 'item':
    default:
      return { ...baseMarker, caption: 'Collectable', feedbackTone: 'default', state: 'idle' };
  }
};

export function buildGamePageViewModel(
  source: GamePageViewModelSource,
): GamePageViewModel {
  const areasById = Object.fromEntries(source.areas.map((area) => [area.id, area]));
  const npcDefinitionsById = Object.fromEntries(
    source.npcDefinitions.map((npc) => [npc.id, npc]),
  );
  const npcStatesById = Object.fromEntries(
    source.npcStates.map((npc) => [npc.npcId, npc]),
  );
  const questDefinitionsById = Object.fromEntries(
    source.questDefinitions.map((quest) => [quest.id, quest]),
  );
  const eventDefinitionsById = Object.fromEntries(
    source.eventDefinitions.map((event) => [event.id, event]),
  );

  const currentArea = source.currentArea;
  const currentAreaEnvironment = currentArea
    ? resolveAreaEnvironmentState(currentArea, source.worldFlags)
    : null;
  const scenePoints = currentArea?.interactionPoints ?? [];
  const maxX = Math.max(12, ...scenePoints.map((point) => point.x));
  const maxY = Math.max(8, ...scenePoints.map((point) => point.y));
  const saveStatus = formatSaveStatus(source.saveStatus);

  const quests = source.questProgressEntries
    .filter((progress) => progress.status === 'active')
    .map((progress) => {
      const definition = questDefinitionsById[progress.questId];
      const objective =
        definition?.objectives[progress.currentObjectiveIndex] ??
        definition?.objectives[definition.objectives.length - 1];

      return {
        id: progress.questId,
        title: definition?.title ?? humanizeToken(progress.questId),
        status: humanizeToken(progress.status),
        objective: objective?.label ?? 'Objective ready',
        progress: `${progress.completedObjectiveIds.length}/${definition?.objectives.length ?? 0} objectives`,
      };
    });

  const currentAreaEvents = (currentArea?.eventIds ?? []).map((eventId) => {
    const event = eventDefinitionsById[eventId];
    const pending = source.eventDirector.pendingEventIds.includes(eventId);
    const triggered = source.eventHistory.some((entry) => entry.eventId === eventId);

    return {
      id: eventId,
      title: event?.title ?? humanizeToken(eventId),
      detail: event?.description ?? 'Dynamic world trigger available.',
      isPending: pending,
      isTriggered: triggered,
    };
  });

  const pendingEventIds = currentAreaEvents
    .filter((event) => event.isPending)
    .map((event) => event.id);
  const stageMarkers = scenePoints.map((point) =>
    buildSceneMarker(point, maxX, maxY, pendingEventIds, {
      currentArea,
      areasById,
      mapState: source.mapState,
      questProgressEntries: source.questProgressEntries,
      worldFlags: source.worldFlags,
      npcStatesById,
    }),
  );
  const stageModel = areaSceneStageModelSchema.parse({
    rendererLabel: 'DOM layered stage placeholder',
    backgroundLabel:
      currentArea?.backgroundKey
        ? `${humanizeToken(currentArea.backgroundKey)} backdrop`
        : `${humanizeToken(currentArea?.type)} palette`,
    engineTargets: ['Phaser-ready', 'Pixi-ready'],
    highlightSummary: pendingEventIds.length
      ? `${pendingEventIds.length} live stage highlights`
      : stageMarkers.some((marker) => marker.type === 'battle')
        ? 'Combat route primed for emphasis'
        : 'Layer stack stable for art upgrade',
    stageTone: pendingEventIds.length
      ? 'warning'
      : stageMarkers.some((marker) => marker.type === 'battle')
        ? 'warning'
        : stageMarkers.some((marker) => marker.type === 'npc')
          ? 'success'
          : 'info',
    layers: buildSceneLayers(currentArea?.type, pendingEventIds.length),
    markers: stageMarkers,
    legend: stageLegend,
  });
  const visibleAreas = source.areas.filter(
    (area) =>
      isAreaVisibleInNavigation(
        area,
        source.mapState.discoveredAreaIds,
        source.mapState.unlockedAreaIds,
      ) || area.id === currentArea?.id,
  );

  const relationships = source.npcStates
    .map((npcState) => {
      const definition = npcDefinitionsById[npcState.npcId];
      return {
        id: npcState.npcId,
        name: definition?.name ?? humanizeToken(npcState.npcId),
        trust: npcState.trust,
        relationship: npcState.relationship,
        disposition: humanizeToken(npcState.currentDisposition),
        areaId: definition?.areaId,
      };
    })
    .sort((left, right) => {
      const leftCurrent = left.areaId === currentArea?.id ? 1 : 0;
      const rightCurrent = right.areaId === currentArea?.id ? 1 : 0;

      if (leftCurrent !== rightCurrent) {
        return rightCurrent - leftCurrent;
      }

      return right.trust - left.trust;
    })
    .slice(0, 5)
    .map((relationship) => ({
      id: relationship.id,
      name: relationship.name,
      trust: relationship.trust,
      relationship: relationship.relationship,
      disposition: relationship.disposition,
    }));

  const enemyAlerts = [
    ...(currentArea?.enemySpawnRules.map((rule) => ({
      id: `spawn:${rule.id}`,
      label: rule.label,
      detail: `${humanizeToken(rule.trigger)} · ${humanizeToken(
        rule.enemyArchetype ?? rule.enemyNpcId ?? rule.encounterId,
      )} · max ${rule.maxActive}`,
      tone:
        rule.trigger === 'always' || currentArea?.type === 'boss'
          ? ('warning' as const)
          : ('info' as const),
    })) ?? []),
    ...(source.combatState
      ? [
          {
            id: `combat:${source.combatState.encounterId}`,
            label: `${source.combatState.enemy.name} engaged`,
            detail: `Turn ${source.combatState.turn} · Active tactic ${humanizeToken(source.combatState.activeTactic)}`,
            tone: 'warning' as const,
          },
        ]
      : []),
    ...source.combatEncounters
      .filter((encounter) => encounter.areaId === currentArea?.id)
      .map((encounter) => ({
        id: encounter.id,
        label: encounter.title,
        detail: `${humanizeToken(encounter.mode)} encounter ready with ${encounter.tacticPool.length} tactic modes`,
        tone: 'info' as const,
      })),
    ...currentAreaEvents
      .filter((event) => event.isPending)
      .map((event) => ({
        id: `event-alert:${event.id}`,
        label: event.title,
        detail: event.detail,
        tone: 'warning' as const,
      })),
  ];

  const logs = source.logEntries.slice(0, 4).map((entry) => ({
    id: entry.id,
    label: humanizeToken(entry.kind),
    detail: entry.summary,
    meta: formatIsoSummary(entry.createdAt),
    tone: logToneByKind[entry.kind],
    emphasis: (
      entry.kind === 'combat'
        ? 'highlight'
        : entry.kind === 'save-load' || entry.kind === 'npc-interaction'
          ? 'recent'
          : 'default'
    ) as GamePageViewModel['logs'][number]['emphasis'],
  }));

  const tips = [
    ...(currentAreaEnvironment?.note
      ? [
          {
            id: 'area-environment',
            title: currentAreaEnvironment.label,
            summary: currentAreaEnvironment.note,
            tone:
              currentAreaEnvironment.hazard === 'volatile'
                ? ('warning' as const)
                : ('info' as const),
          },
        ]
      : []),
    ...source.playerModel.rationale.slice(0, 2).map((summary, index) => ({
      id: `player-model:${index}`,
      title: index === 0 ? 'Player model' : 'Behavior pattern',
      summary,
      tone: 'info' as const,
    })),
    ...(source.review?.explanations.slice(0, 2).map((explanation, index) => ({
      id: `review:${index}`,
      title: explanation.title,
      summary: explanation.summary,
      tone: explanation.type === 'combat' ? ('warning' as const) : ('success' as const),
    })) ?? []),
    ...(source.eventDirector.pacingNote
      ? [
          {
            id: 'director:pacing',
            title: 'Game master pacing',
            summary: source.eventDirector.pacingNote,
            tone: 'default' as const,
          },
        ]
      : []),
  ].slice(0, 4);

  return {
    topBar: {
      worldName: source.worldSummary.name,
      worldSubtitle: source.worldSummary.subtitle,
      currentArea: currentArea?.name ?? 'Unknown area',
      areaType: humanizeToken(currentArea?.type),
      timeWeather: `${source.worldRuntime.timeOfDay ?? 'Unknown time'} · ${source.worldRuntime.weather ?? 'Unknown weather'}`,
      saveStatus: saveStatus.label,
      saveDetail: `${source.saveMetadata.label ?? source.saveMetadata.slot ?? source.saveMetadata.id} · ${formatIsoSummary(source.saveMetadata.updatedAt)}`,
      saveTone: saveStatus.tone,
    },
    leftSidebar: {
      areas: visibleAreas.map((area) => ({
        id: area.id,
        name: area.name,
        status:
          area.id === currentArea?.id
            ? 'Current'
            : source.mapState.unlockedAreaIds.includes(area.id)
              ? 'Unlocked'
              : source.mapState.discoveredAreaIds.includes(area.id)
                ? 'Known'
                : 'Sealed',
        isCurrent: area.id === currentArea?.id,
        isDiscovered: source.mapState.discoveredAreaIds.includes(area.id),
        isUnlocked:
          area.unlockedByDefault || source.mapState.unlockedAreaIds.includes(area.id),
        isConnected:
          area.id === currentArea?.id ||
          currentArea?.connectedAreaIds.includes(area.id) === true ||
          area.connectedAreaIds.includes(currentArea?.id ?? ''),
      })),
      progressPercent: toPercent(
        source.mapState.discoveredAreaIds.length,
        source.areas.length,
      ),
      progressMetrics: [
        {
          label: 'Discovered',
          value: `${source.mapState.discoveredAreaIds.length}/${source.areas.length}`,
        },
        {
          label: 'Unlocked',
          value: `${source.mapState.unlockedAreaIds.length}/${source.areas.length}`,
        },
        {
          label: 'Visits',
          value: `${source.mapState.visitHistory.length}`,
        },
      ],
      areaSummary: currentArea
        ? `${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)} · ${currentArea.resourceNodes.length} resource nodes · ${currentArea.enemySpawnRules.length} spawn rules`
        : 'Explore the current region to uncover more routes.',
    },
    scene: {
      areaName: currentArea?.name ?? 'Unknown area',
      areaType: humanizeToken(currentArea?.type),
      description: currentArea
        ? `${currentArea.description} 当前环境：${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)}。`
        : 'No active area is loaded. Restore or create a world to continue.',
      sceneStatus: `${stageModel.layers.length} render layers · ${stageModel.markers.length} interaction points · ${currentAreaEvents.length} area events · ${currentArea?.resourceNodes.length ?? 0} resource nodes · ${currentArea?.enemySpawnRules.length ?? 0} spawn rules`,
      stage: stageModel,
      npcs: (currentArea?.npcIds ?? []).map((npcId) => {
        const definition = npcDefinitionsById[npcId];
        const runtime = npcStatesById[npcId];

        return {
          id: npcId,
          name: definition?.name ?? humanizeToken(npcId),
          role: humanizeToken(definition?.role),
          disposition: humanizeToken(runtime?.currentDisposition),
          trust: runtime?.trust ?? 0,
          relationship: runtime?.relationship ?? 0,
        };
      }),
      events: currentAreaEvents,
    },
    rightSidebar: {
      quests: quests.length
        ? quests
        : [
            {
              id: 'quest:none',
              title: 'No active quests',
              status: 'Idle',
              objective: 'Use the debug route or interact with NPCs to activate quest beats.',
              progress: '0/0 objectives',
            },
          ],
      inventory: source.player.inventory.map((item) => ({
        id: item.itemId,
        label: humanizeToken(item.itemId),
        quantity: item.quantity,
      })),
      playerStatus: [
        {
          label: 'HP',
          value: `${source.player.hp}/${source.player.maxHp}`,
        },
        {
          label: 'Energy',
          value: `${source.player.energy ?? 0}`,
        },
        {
          label: 'Gold',
          value: `${source.player.gold}`,
        },
        {
          label: 'Dominant Style',
          value: humanizeToken(
            source.playerModel.dominantStyle ?? source.playerModel.tags[0],
          ),
        },
      ],
      playerTags: source.playerModel.tags.map((tag) => humanizeToken(tag)),
      relationships,
      enemyAlerts: enemyAlerts.length
        ? enemyAlerts
        : [
            {
              id: 'enemy-alert:none',
              label: 'Threat level stable',
              detail: 'No current boss escalation or hostile event is pressing this area.',
              tone: 'success',
            },
          ],
    },
    logs: logs.length
      ? logs
      : [
          {
            id: 'log:none',
            label: 'Awaiting action',
            detail: 'Interact with the world to populate the runtime feed.',
            meta: 'Idle',
            tone: 'default',
            emphasis: 'default',
          },
        ],
    tips: tips.length
      ? tips
      : [
          {
            id: 'tip:none',
            title: 'Explainability pending',
            summary: 'Talk, fight, or trigger events to surface visible AI rationale here.',
            tone: 'default',
          },
        ],
  };
}
