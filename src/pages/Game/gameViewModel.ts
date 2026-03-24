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

const localizedTokenLabels: Record<string, string> = {
  town: '城镇',
  wilderness: '荒野',
  dungeon: '地下遗迹',
  ruin: '遗迹',
  shop: '商铺',
  boss: '首领区域',
  hidden: '隐藏区域',
  npc: '角色',
  item: '物品',
  portal: '传送',
  event: '事件',
  battle: '战斗',
  guide: '向导',
  merchant: '商贩',
  villager: '居民',
  scholar: '学者',
  guard: '守卫',
  enemy: '敌方',
  mystic: '秘术师',
  friendly: '友善',
  neutral: '中立',
  suspicious: '戒备',
  hostile: '敌对',
  afraid: '畏惧',
  secretive: '隐秘',
  locked: '未解锁',
  available: '可接取',
  active: '进行中',
  completed: '已完成',
  failed: '已失败',
  main: '主线',
  side: '支线',
  tutorial: '引导',
  dynamic: '动态',
  talk: '对话',
  visit: '到访',
  collect: '收集',
  trigger: '触发',
  always: '常驻',
  'on-enter': '进入时',
  'on-search': '搜索时',
  'on-event': '事件触发时',
  'on-alert': '警戒时',
  'turn-based': '回合制',
  'semi-realtime': '半即时',
  supply: '补给',
  ore: '矿石',
  herb: '草药',
  relic: '遗物',
  ember: '余烬',
  cache: '储藏',
  exploration: '探索',
  story: '剧情',
  combat: '战斗',
  risky: '高风险',
  cautious: '谨慎',
  hybrid: '混合',
  aggressive: '强攻',
  defensive: '防守',
  counter: '反击',
  trap: '陷阱',
  summon: '召唤',
  'resource-lock': '资源封锁',
  'save-load': '存档记录',
  'agent-decision': '代理决策',
  'npc-interaction': '角色互动',
  'domain-event': '领域事件',
  'explanation-input': '解释输入',
  'ash-scout': '灰烬斥候',
  'echo-sentry': '回响哨卫',
  'seal-ward': '封印守卫',
  'ember-trap': '余烬陷阱',
  'shadow-lurker': '暗影潜伏者',
  'ember-salve': '余烬药膏',
  cindersage: '烬尾草',
  'relay-core-fragment': '中继核心碎片',
  dustbloom: '尘华花',
  'ember-shard': '余烬碎片',
  'sealed-relic': '封印遗物',
  'ember-resin': '余烬树脂',
  'cinder-tonic': '烬火药剂',
  'archive-pass': '秘库通行证',
  'bg-cinder-crossroads': '灰烬岔路口背景',
  'bg-sunken-archive': '沉没秘库背景',
  'bg-ember-sanctum': '余烬圣所背景',
  'bg-ember-grotto': '余烬洞窟背景',
};

const localizedStageCopy: Record<string, string> = {
  'Town skyline': '城镇天际线',
  'Market mist': '市集薄雾',
  'Courtyard floor': '庭院地面',
  'Main route': '主干路线',
  'Reflective canal': '映光水渠',
  'Roofline west': '西侧屋顶线',
  'Watchtower east': '东侧瞭望塔',
  'Merchant stalls': '商贩摊位',
  'Cartography beacon': '测绘信标',
  'Guide signal': '向导信号',
  'Bazaar skyline': '集市天际线',
  'Lantern haze': '灯火薄霭',
  'Market ground': '市集地面',
  'Trade aisle': '交易通道',
  'Booth row': '摊棚长列',
  'Merchant stand': '商人站台',
  'Trade shimmer': '交易微光',
  'Forest canopy sky': '林冠天幕',
  'Roving fog': '游移薄雾',
  'Meadow floor': '草甸地面',
  'Stream bend': '溪流弯道',
  'Trail branch': '岔路小径',
  'Dense grove': '密林树丛',
  'Stone arch': '石拱门',
  'Watch perch': '瞭望高台',
  'Glade shimmer': '林间微光',
  'Trail signal': '路径信号',
  'Hidden sky': '隐秘天幕',
  'Hidden veil': '隐秘帷幕',
  'Hidden clearing': '隐秘空地',
  'Secret trail': '密径',
  'Ancient grove': '古树林地',
  'Hidden arch': '隐秘拱门',
  'Secret glow': '秘光',
  'Shadowed vault': '阴影穹厅',
  'Rune wash': '符文辉光',
  'Stone floor': '石质地面',
  'Dungeon walkway': '地宫步道',
  'Arcane rift': '奥术裂隙',
  'Ritual gate': '仪式之门',
  'Broken spire': '破碎尖塔',
  'Ritual halo': '仪式光环',
  'Ruin haze': '遗迹迷雾',
  'Old glow': '古老辉光',
  'Crumbling stone': '崩裂石地',
  'Collapsed route': '坍塌路径',
  'Broken wall': '残破城墙',
  'Ruin arch': '遗迹拱门',
  'Ruin shimmer': '遗迹微光',
  'Boss vault': '首领穹厅',
  'Boss aura': '首领气场',
  'Boss floor': '首领场地',
  'Challenge lane': '挑战通道',
  'Threat rift': '威胁裂隙',
  'Boss gate': '首领之门',
  'Threat spire': '威压尖塔',
  'Threat halo': '威胁光环',
  'Boss signal': '首领信号',
  'Fallback sky': '备用天幕',
  'Fallback ground': '备用地面',
  'Fallback arch': '备用拱门',
  'Ambient stage glow': '环境舞台微光',
  'Background Layer': '背景层',
  'Terrain Layer': '地形层',
  'Structure Layer': '结构层',
  'Highlight Layer': '高亮层',
  'Sky and mood placeholders compatible with later parallax rendering.': '天空与氛围占位层，可兼容后续视差渲染。',
  'Ground, route, and floor massing isolated from structure art.': '将地面、路线与场地体块从建筑美术中拆分展示。',
  'Buildings and silhouette props rendered on a separate sprite plane.': '建筑与轮廓道具在独立精灵平面中渲染。',
  'Signals and event emphasis stay decoupled from domain rules.': '信号与事件强调层保持与领域规则解耦。',
  'Live event flare': '实时事件闪光',
  'NPC lane': '角色通道',
  'Portal route': '传送路线',
  'Item pickup': '物品拾取',
  'Battle alert': '战斗预警',
  'Event trigger': '事件触发',
};

const localizeStageCopy = (value: string) => localizedStageCopy[value] ?? value;

const humanizeToken = (value: string | undefined) => {
  if (!value) {
    return '未知';
  }

  const sanitized = value.replace(/^[^:]+:/, '');

  return (
    localizedTokenLabels[sanitized] ??
    sanitized
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const formatSaveStatus = (
  saveStatus: SaveLifecycleStatus,
): {
  label: string;
  tone: 'default' | 'success' | 'warning' | 'info';
} => {
  switch (saveStatus) {
    case 'saved':
      return { label: '已保存', tone: 'success' };
    case 'saving':
      return { label: '保存中', tone: 'info' };
    case 'error':
      return { label: '保存失败', tone: 'warning' };
    case 'dirty':
      return { label: '有未保存变更', tone: 'warning' };
    case 'hydrated':
      return { label: '已载入', tone: 'info' };
    default:
      return { label: '空闲', tone: 'default' };
  }
};

const formatIsoSummary = (value: string | undefined) =>
  value ? value.replace('T', ' · ').slice(0, 16) : '暂无存档时间';

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
  label: localizeStageCopy(label),
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
  label: localizeStageCopy(label),
  detail: localizeStageCopy(detail),
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
  { id: 'legend:npc', label: '角色通道', tone: 'success' },
  { id: 'legend:portal', label: '传送路线', tone: 'info' },
  { id: 'legend:item', label: '物品拾取', tone: 'default' },
  { id: 'legend:battle', label: '战斗预警', tone: 'warning' },
  { id: 'legend:event', label: '事件触发', tone: 'warning' },
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
  battle: '战',
  event: '事',
  item: '物',
  npc: '人',
  portal: '传',
  shop: '商',
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
  const portalGlyph = point.travelMode === 'teleport' ? '瞬' : '传';

  if (point.type === 'portal' && !isPortalAccessible) {
    return {
      id: point.id,
      label: point.label,
      caption:
        point.travelMode === 'teleport'
          ? '瞬移点未解锁'
          : isHiddenRoute
            ? '隐藏路线已封闭'
            : '路线未解锁',
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
      caption: '节点离线',
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
      return { ...baseMarker, caption: '对话 / 信任', feedbackTone: 'success', state: 'focus' };
    case 'shop':
      return { ...baseMarker, caption: '交易通道', feedbackTone: 'success', state: 'focus' };
    case 'portal':
      return {
        ...baseMarker,
        caption:
          point.travelMode === 'teleport'
            ? '瞬移点'
            : isHiddenRoute
              ? '隐藏路线'
              : '区域路线',
        feedbackTone: point.travelMode === 'teleport' ? 'warning' : 'info',
        state: 'focus',
      };
    case 'battle':
      return { ...baseMarker, caption: '进入战斗', feedbackTone: 'warning', state: 'alert' };
    case 'event':
      return {
        ...baseMarker,
        caption: isPendingEvent ? '待触发事件' : '世界事件',
        feedbackTone: isPendingEvent ? 'warning' : 'info',
        state: isPendingEvent ? 'alert' : 'focus',
      };
    case 'item':
    default:
      return { ...baseMarker, caption: '可收集物', feedbackTone: 'default', state: 'idle' };
  }
};

const getQuestStepList = (definition: QuestDefinition | undefined) => {
  if (!definition) {
    return [];
  }

  return definition.completionConditions.length > 0
    ? definition.completionConditions
    : definition.objectives ?? [];
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
      const questSteps = getQuestStepList(definition);
      const objective =
        questSteps[progress.currentObjectiveIndex] ??
        questSteps[questSteps.length - 1];

      return {
        id: progress.questId,
        title: definition?.title ?? humanizeToken(progress.questId),
        status: humanizeToken(progress.status),
        objective: objective?.label ?? '目标已就绪',
        progress: `${progress.completedObjectiveIds.length}/${questSteps.length} 个目标`,
      };
    });

  const currentAreaEvents = (currentArea?.eventIds ?? []).map((eventId) => {
    const event = eventDefinitionsById[eventId];
    const pending = source.eventDirector.pendingEventIds.includes(eventId);
    const triggered = source.eventHistory.some((entry) => entry.eventId === eventId);

    return {
      id: eventId,
      title: event?.title ?? humanizeToken(eventId),
      detail: event?.description ?? '可触发的动态世界事件已就绪。',
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
    rendererLabel: '分层舞台占位渲染',
    backgroundLabel:
      currentArea?.backgroundKey
        ? `${humanizeToken(currentArea.backgroundKey)}`
        : `${humanizeToken(currentArea?.type)}主色板`,
    engineTargets: ['场景引擎预留', '像素渲染预留'],
    highlightSummary: pendingEventIds.length
      ? `当前有 ${pendingEventIds.length} 处场景高亮`
      : stageMarkers.some((marker) => marker.type === 'battle')
        ? '战斗路线已进入强调态'
        : '分层结构已稳定，可继续美术升级',
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
      )} · 上限 ${rule.maxActive}`,
      tone:
        rule.trigger === 'always' || currentArea?.type === 'boss'
          ? ('warning' as const)
          : ('info' as const),
    })) ?? []),
    ...(source.combatState
        ? [
            {
              id: `combat:${source.combatState.encounterId}`,
              label: `${source.combatState.enemy.name} 已交战`,
              detail: `第 ${source.combatState.turn} 回合 · 当前战术 ${humanizeToken(source.combatState.activeTactic)}`,
              tone: 'warning' as const,
            },
          ]
      : []),
    ...source.combatEncounters
      .filter((encounter) => encounter.areaId === currentArea?.id)
      .map((encounter) => ({
        id: encounter.id,
        label: encounter.title,
        detail: `${humanizeToken(encounter.mode)}遭遇已就绪，含 ${encounter.tacticPool.length} 种战术模式`,
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
      title: index === 0 ? '玩家模型' : '行为模式',
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
              title: '游戏主持节奏',
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
      currentArea: currentArea?.name ?? '未知区域',
      areaType: humanizeToken(currentArea?.type),
      timeWeather: `${source.worldRuntime.timeOfDay ?? '未知时段'} · ${source.worldRuntime.weather ?? '未知天气'}`,
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
            ? '当前'
            : source.mapState.unlockedAreaIds.includes(area.id)
              ? '已解锁'
              : source.mapState.discoveredAreaIds.includes(area.id)
                ? '已知'
                : '封闭',
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
          label: '已发现',
          value: `${source.mapState.discoveredAreaIds.length}/${source.areas.length}`,
        },
        {
          label: '已解锁',
          value: `${source.mapState.unlockedAreaIds.length}/${source.areas.length}`,
        },
        {
          label: '到访次数',
          value: `${source.mapState.visitHistory.length}`,
        },
      ],
      areaSummary: currentArea
        ? `${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)} · ${currentArea.resourceNodes.length} 个资源点 · ${currentArea.enemySpawnRules.length} 条刷怪规则`
        : '继续探索当前区域，解锁更多路线。',
    },
    scene: {
      areaName: currentArea?.name ?? '未知区域',
      areaType: humanizeToken(currentArea?.type),
      description: currentArea
        ? `${currentArea.description} 当前环境：${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)}。`
        : '当前没有已载入的活动区域，请先恢复存档或创建世界。',
      sceneStatus: `${stageModel.layers.length} 层渲染 · ${stageModel.markers.length} 个交互点 · ${currentAreaEvents.length} 个区域事件 · ${currentArea?.resourceNodes.length ?? 0} 个资源点 · ${currentArea?.enemySpawnRules.length ?? 0} 条刷怪规则`,
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
              title: '暂无进行中的任务',
              status: '空闲',
              objective: '可通过调试入口或与区域角色互动来激活任务节点。',
              progress: '0/0 个目标',
            },
          ],
      inventory: source.player.inventory.map((item) => ({
        id: item.itemId,
        label: humanizeToken(item.itemId),
        quantity: item.quantity,
      })),
      playerStatus: [
        {
          label: '生命',
          value: `${source.player.hp}/${source.player.maxHp}`,
        },
        {
          label: '精力',
          value: `${source.player.energy ?? 0}`,
        },
        {
          label: '金币',
          value: `${source.player.gold}`,
        },
        {
          label: '主导风格',
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
              label: '威胁等级稳定',
              detail: '当前区域没有首领升级压力，也没有敌对事件正在逼近。',
              tone: 'success',
            },
          ],
    },
    logs: logs.length
      ? logs
      : [
          {
            id: 'log:none',
            label: '等待行动',
            detail: '与世界发生互动后，这里会填充新的运行记录。',
            meta: '空闲',
            tone: 'default',
            emphasis: 'default',
          },
        ],
    tips: tips.length
      ? tips
      : [
          {
            id: 'tip:none',
            title: '可解释信息待生成',
            summary: '进行对话、战斗或触发事件后，这里会展示清晰可见的智能决策依据。',
            tone: 'default',
          },
        ],
  };
}
