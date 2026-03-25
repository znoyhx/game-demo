import {
  areaSceneStageModelSchema,
  type AreaSceneMarker,
  type AreaSceneStageModel,
  type AreaSceneTile,
} from '../../components/map/areaSceneStage.contract';
import { buildPixelSceneRenderModel } from '../../components/map/phaser/buildPixelSceneRenderModel';
import type { PixelSceneRenderModel } from '../../components/map/phaser/pixelSceneRenderer.contract';
import type { GameLogRecord } from '../../core/logging/logTypes';
import {
  buildPlayerGuidanceHints,
  evaluateAreaAccess,
  evaluateEventTrigger,
  isAreaVisibleInNavigation,
  resolveAreaEnvironmentState,
} from '../../core/rules';
import {
  formatNpcDispositionLabel,
  formatNpcEmotionalStateLabel,
  formatPlayerTagLabel,
} from '../../core/utils/displayLabels';
import type {
  Area,
  CombatEncounterDefinition,
  CombatState,
  EventDirectorState,
  EventLogEntry,
  ExplorationEncounterSignal,
  ExplorationState,
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
  explorationState: ExplorationState;
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
    renderScene: PixelSceneRenderModel;
    npcs: Array<{
      id: string;
      name: string;
      role: string;
      disposition: string;
      emotionalState: string;
      trust: number;
      relationship: number;
    }>;
    events: Array<{
      id: string;
      title: string;
      detail: string;
      isPending: boolean;
      isTriggered: boolean;
      naturallyTriggerable: boolean;
      naturalReason?: string;
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
      emotionalState: string;
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
  dungeon: '地城',
  ruin: '遗迹',
  shop: '商店',
  boss: '首领区域',
  hidden: '隐藏区域',
  npc: '人物',
  item: '物品',
  portal: '传送点',
  event: '事件',
  battle: '战斗',
  guide: '向导',
  merchant: '商人',
  villager: '村民',
  scholar: '学者',
  guard: '守卫',
  enemy: '敌人',
  mystic: '秘术师',
  friendly: '友善',
  neutral: '中立',
  suspicious: '戒备',
  hostile: '敌对',
  afraid: '畏惧',
  secretive: '隐秘',
  locked: '已锁定',
  available: '可前往',
  active: '进行中',
  completed: '已完成',
  failed: '已失败',
  main: '主线',
  side: '支线',
  tutorial: '教学',
  dynamic: '动态',
  talk: '对话',
  visit: '拜访',
  collect: '收集',
  trigger: '触发',
  always: '常驻',
  'on-enter': '进入触发',
  'on-search': '搜索触发',
  'on-event': '事件触发',
  'on-alert': '警戒触发',
  'turn-based': '回合制',
  'semi-realtime': '半即时',
  supply: '补给',
  ore: '矿石',
  herb: '药草',
  relic: '遗物',
  ember: '余烬',
  cache: '储藏点',
  exploration: '探索',
  story: '剧情',
  combat: '战斗',
  risky: '冒险型',
  cautious: '谨慎型',
  hybrid: '混合型',
  aggressive: '强攻压制',
  defensive: '防守消耗',
  counter: '反制应对',
  trap: '诱捕陷阱',
  summon: '召唤支援',
  'resource-lock': '资源封锁',
  'save-load': '存档流转',
  'agent-decision': '智能决策',
  'npc-interaction': '角色互动',
  'domain-event': '世界事件',
  'explanation-input': '解释输入',
  'ash-scout': '灰烬斥候',
  'echo-sentry': '回响哨卫',
  'seal-ward': '封印守卫',
  'ember-trap': '余烬陷阱',
  'shadow-lurker': '影潜伏者',
  cindersage: '灰烬贤者',
  'relay-core-fragment': '中继核心碎片',
  dustbloom: '尘花',
  'ember-shard': '余烬碎片',
  'sealed-relic': '封印遗物',
  'ember-resin': '余烬树脂',
  'cinder-tonic': '灰烬药剂',
  'archive-pass': '档案通行证',
  'bg-cinder-crossroads': '灰烬十字路口',
  'bg-sunken-archive': '沉没档案库',
  'bg-ember-sanctum': '余烬圣所',
  'bg-ember-grotto': '余烬洞窟',
};

const localizedStageCopy: Record<string, string> = {
  'Town skyline': '城镇天际线',
  'Market mist': '集市薄雾',
  'Courtyard floor': '庭院地面',
  'Main route': '主干道路',
  'Reflective canal': '倒影水渠',
  'Roofline west': '西侧屋脊',
  'Watchtower east': '东侧瞭望塔',
  'Merchant stalls': '商贩摊位',
  'Cartography beacon': '制图信标',
  'Guide signal': '向导路标',
  'Bazaar skyline': '市集天际线',
  'Lantern haze': '灯笼微光',
  'Market ground': '商路地坪',
  'Trade aisle': '交易通道',
  'Booth row': '摊位列阵',
  'Merchant stand': '商人站点',
  'Trade shimmer': '交易辉光',
  'Forest canopy sky': '林冠天空',
  'Roving fog': '游移薄雾',
  'Meadow floor': '草甸地表',
  'Stream bend': '溪流转角',
  'Trail branch': '岔路',
  'Dense grove': '密林',
  'Stone arch': '石拱',
  'Watch perch': '观察台',
  'Glade shimmer': '林间微光',
  'Trail signal': '路径信号',
  'Hidden sky': '隐匿天空',
  'Hidden veil': '隐蔽帷幕',
  'Hidden clearing': '隐秘空地',
  'Secret trail': '秘径',
  'Ancient grove': '古老林地',
  'Hidden arch': '隐门拱廊',
  'Secret glow': '秘光',
  'Shadowed vault': '暗影穹室',
  'Rune wash': '符文流辉',
  'Stone floor': '石板地面',
  'Dungeon walkway': '地城步道',
  'Arcane rift': '奥术裂隙',
  'Ritual gate': '仪式之门',
  'Broken spire': '断裂尖塔',
  'Ritual halo': '仪式光环',
  'Ruin haze': '遗迹尘雾',
  'Old glow': '残旧辉光',
  'Crumbling stone': '崩裂石墙',
  'Collapsed route': '坍塌通路',
  'Broken wall': '残破墙体',
  'Ruin arch': '遗迹拱门',
  'Ruin shimmer': '遗迹闪辉',
  'Boss vault': '首领穹室',
  'Boss aura': '首领威压',
  'Boss floor': '首领地坪',
  'Challenge lane': '挑战走廊',
  'Threat rift': '威胁裂痕',
  'Boss gate': '首领之门',
  'Threat spire': '威压尖塔',
  'Threat halo': '威胁光环',
  'Boss signal': '首领警示',
  'Fallback sky': '备用天空',
  'Fallback ground': '备用地面',
  'Fallback arch': '备用拱门',
  'Ambient stage glow': '环境舞台辉光',
  'Background Layer': '背景层',
  'Terrain Layer': '地形层',
  'Structure Layer': '建筑层',
  'Highlight Layer': '高亮层',
  'Sky and mood placeholders compatible with later parallax rendering.': '用于承载天空与氛围的背景占位，可平滑升级到视差渲染。',
  'Ground, route, and floor massing isolated from structure art.': '将地面、道路与平台体块独立出来，保持场景结构清晰。',
  'Buildings and silhouette props rendered on a separate sprite plane.': '建筑与剪影道具单独成层，便于后续扩展动画和遮挡。',
  'Signals and event emphasis stay decoupled from domain rules.': '交互信号与事件强调效果独立呈现，不直接耦合规则逻辑。',
  'Live event flare': '事件闪光',
  'NPC lane': '人物路线',
  'Portal route': '传送路径',
  'Item pickup': '物资拾取',
  'Battle alert': '战斗警示',
  'Event trigger': '事件触发',
};

const localizeStageCopy = (value: string) => localizedStageCopy[value] ?? value;

const humanizeToken = (value: string | undefined) => {
  if (!value) {
    return '未命名';
  }

  const sanitized = value.replace(/^[^:]+:/, '');

  return (
    localizedTokenLabels[sanitized] ??
    sanitized
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const localizedWorldFlagLabels: Record<string, string> = {
  tutorialCompleted: '完成前哨引导',
  ashfallWarningSeen: '已见到灰烬预警',
  supplyShortageActive: '补给短缺已生效',
  marketPanicActive: '集市恐慌已生效',
  rowanRedeployed: '巡防队已改道',
  archiveEchoSeen: '已发现秘库回响',
  forbiddenChantExposed: '禁咒残篇已暴露',
  borderSkirmishActive: '边界冲突已激活',
  ashWardenSighted: '灰烬守卫已现身',
  wardenAlertRaised: '守卫警戒已提升',
  sanctumLockdownActive: '圣所封锁已启动',
  archiveDoorOpened: '秘库门已开启',
  sanctumSealBroken: '圣所封印已破除',
};

interface EventReasonDisplayContext {
  areasById: Record<string, Area>;
  questDefinitionsById: Record<string, QuestDefinition>;
  npcDefinitionsById: Record<string, NpcDefinition>;
}

interface EventDisplayState {
  naturallyTriggerable: boolean;
  naturalReasons: string[];
  naturalReason?: string;
}

const localizeEventTriggerReason = (
  reason: string,
  context: EventReasonDisplayContext,
) => {
  if (reason === '事件已经触发过，且不可重复触发') {
    return '该事件已经触发过，不能重复触发。';
  }

  if (reason === '事件触发条件已满足') {
    return '事件触发条件已满足。';
  }

  const areaMatch = reason.match(/^需要位于区域 (.+)$/);
  if (areaMatch) {
    const areaName = context.areasById[areaMatch[1]]?.name ?? humanizeToken(areaMatch[1]);
    return `需要位于“${areaName}”。`;
  }

  const questStatusMatch = reason.match(/^需要任务 (.+?) 处于 (.+)$/);
  if (questStatusMatch) {
    const [, questId, status] = questStatusMatch;
    const questTitle =
      context.questDefinitionsById[questId]?.title ?? humanizeToken(questId);
    return `需要任务“${questTitle}”处于“${humanizeToken(status)}”状态。`;
  }

  const questActiveMatch = reason.match(/^需要任务 (.+?) 已激活或已完成$/);
  if (questActiveMatch) {
    const questId = questActiveMatch[1];
    const questTitle =
      context.questDefinitionsById[questId]?.title ?? humanizeToken(questId);
    return `需要先激活或完成任务“${questTitle}”。`;
  }

  const questMissingMatch = reason.match(/^需要任务 (.+)$/);
  if (questMissingMatch) {
    const questId = questMissingMatch[1];
    const questTitle =
      context.questDefinitionsById[questId]?.title ?? humanizeToken(questId);
    return `需要先拥有任务“${questTitle}”。`;
  }

  const playerTagMatch = reason.match(/^需要玩家标签 (.+)$/);
  if (playerTagMatch) {
    const playerTag = playerTagMatch[1] as PlayerModelState['tags'][number];
    return `需要玩家风格为“${formatPlayerTagLabel(playerTag)}”。`;
  }

  const worldFlagMatch = reason.match(/^需要世界标记 (.+)$/);
  if (worldFlagMatch) {
    const flagLabel =
      localizedWorldFlagLabels[worldFlagMatch[1]] ?? humanizeToken(worldFlagMatch[1]);
    return `需要满足前置条件：${flagLabel}。`;
  }

  const npcStateMatch = reason.match(/^需要角色状态 (.+)$/);
  if (npcStateMatch) {
    const npcId = npcStateMatch[1];
    const npcName = context.npcDefinitionsById[npcId]?.name ?? humanizeToken(npcId);
    return `需要先拥有“${npcName}”的状态数据。`;
  }

  const npcTrustMatch = reason.match(/^需要角色 (.+?) 信任度至少为 (\d+)$/);
  if (npcTrustMatch) {
    const [, npcId, trust] = npcTrustMatch;
    const npcName = context.npcDefinitionsById[npcId]?.name ?? humanizeToken(npcId);
    return `需要“${npcName}”的信任度至少达到 ${trust}。`;
  }

  const npcRelationshipMatch = reason.match(/^需要角色 (.+?) 关系值至少为 (\d+)$/);
  if (npcRelationshipMatch) {
    const [, npcId, relationship] = npcRelationshipMatch;
    const npcName = context.npcDefinitionsById[npcId]?.name ?? humanizeToken(npcId);
    return `需要“${npcName}”的关系值至少达到 ${relationship}。`;
  }

  const timeMatch = reason.match(/^需要时间段 (.+)$/);
  if (timeMatch) {
    return `需要在“${timeMatch[1]}”时触发。`;
  }

  const minimumTensionMatch = reason.match(/^需要世界张力至少为 (\d+)$/);
  if (minimumTensionMatch) {
    return `需要世界张力至少达到 ${minimumTensionMatch[1]}。`;
  }

  const maximumTensionMatch = reason.match(/^需要世界张力不高于 (\d+)$/);
  if (maximumTensionMatch) {
    return `需要世界张力不高于 ${maximumTensionMatch[1]}。`;
  }

  return reason;
};

const buildEventDisplayState = (
  event: WorldEvent | undefined,
  source: Pick<
    GamePageViewModelSource,
    | 'questProgressEntries'
    | 'playerModel'
    | 'worldFlags'
    | 'eventHistory'
    | 'npcStates'
    | 'worldRuntime'
    | 'eventDirector'
  > & {
    currentAreaId: string;
  },
  context: EventReasonDisplayContext,
): EventDisplayState => {
  if (!event) {
    return {
      naturallyTriggerable: false,
      naturalReasons: ['事件配置缺失。'],
      naturalReason: '事件配置缺失。',
    };
  }

  const evaluation = evaluateEventTrigger(event, {
    currentAreaId: source.currentAreaId,
    questProgressEntries: source.questProgressEntries,
    playerTags: source.playerModel.tags,
    worldFlags: source.worldFlags,
    eventHistory: source.eventHistory,
    npcStatesById: Object.fromEntries(
      source.npcStates.map((npcState) => [npcState.npcId, npcState]),
    ),
    worldTimeOfDay: source.worldRuntime.timeOfDay,
    worldTension: source.eventDirector.worldTension,
  });

  const naturalReasons = evaluation.reasons.map((reason) =>
    localizeEventTriggerReason(reason, context),
  );

  return {
    naturallyTriggerable: evaluation.ok,
    naturalReasons,
    naturalReason: naturalReasons[0],
  };
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
      return { label: '有未保存更改', tone: 'warning' };
    case 'hydrated':
      return { label: '已恢复', tone: 'info' };
    default:
      return { label: '空闲', tone: 'default' };
  }
};

const formatIsoSummary = (value: string | undefined) =>
  value ? value.replace('T', ' · ').slice(0, 16) : '暂无时间';

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
  { id: 'legend:npc', label: '人物', tone: 'success' },
  { id: 'legend:portal', label: '传送门', tone: 'info' },
  { id: 'legend:item', label: '物品', tone: 'default' },
  { id: 'legend:battle', label: '战斗', tone: 'warning' },
  { id: 'legend:event', label: '事件', tone: 'warning' },
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
  battle: '⚔',
  event: '！',
  item: '箱',
  npc: '人',
  portal: '门',
  shop: '店',
};

interface MarkerAccessContext {
  currentArea: Area | null;
  areasById: Record<string, Area>;
  mapState: GamePageViewModelSource['mapState'];
  explorationState: ExplorationState;
  questProgressEntries: QuestProgress[];
  questDefinitionsById: Record<string, QuestDefinition>;
  worldFlags: World['flags'];
  npcStatesById: Record<string, NpcState>;
  npcDefinitionsById: Record<string, NpcDefinition>;
  playerModel: PlayerModelState;
  worldRuntime: GamePageViewModelSource['worldRuntime'];
  eventDefinitionsById: Record<string, WorldEvent>;
  eventHistory: EventLogEntry[];
  eventDirector: EventDirectorState;
}

const buildSceneMarker = (
  point: Area['interactionPoints'][number],
  maxX: number,
  maxY: number,
  pendingEventIds: string[],
  accessContext: MarkerAccessContext,
): AreaSceneMarker => {
  const resourceNodeId =
    point.type === 'item' ? point.resourceNodeId : undefined;
  const isSearchedItem =
    point.type === 'item' &&
    accessContext.explorationState.searchedInteractionIds.includes(point.id);
  const isCollectedItemResource =
    point.type === 'item' &&
    resourceNodeId !== undefined &&
    accessContext.explorationState.collectedResourceNodeIds.includes(
      resourceNodeId,
    );
  const isPendingEvent =
    point.type === 'event' &&
    pendingEventIds.includes(point.targetId ?? point.id);
  const eventId = point.type === 'event' ? (point.targetId ?? point.id) : null;
  const eventDefinition = eventId
    ? accessContext.eventDefinitionsById[eventId]
    : undefined;
  const isTriggeredEvent =
    eventId !== null &&
    accessContext.eventHistory.some((entry) => entry.eventId === eventId);
  const isCompletedEvent =
    point.type === 'event' &&
    isTriggeredEvent &&
    eventDefinition?.repeatable === false;
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
  const portalGlyph = point.travelMode === 'teleport' ? '✦' : '门';

  if (point.type === 'portal' && !isPortalAccessible) {
    return {
      id: point.id,
      label: point.label,
      caption:
        point.travelMode === 'teleport'
          ? '传送尚未校准'
          : isHiddenRoute
            ? '隐藏通路尚未发现'
            : '路线尚未解锁',
      glyph: portalGlyph,
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      mapX: point.x,
      mapY: point.y,
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
      caption: '当前不可交互',
      glyph: point.type === 'portal' ? portalGlyph : markerGlyphByType[point.type],
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      mapX: point.x,
      mapY: point.y,
      xPercent: clampPercent((point.x / maxX) * 100),
      yPercent: clampPercent((point.y / maxY) * 100),
      feedbackTone: 'default',
      state: 'disabled',
    };
  }

  if (isSearchedItem) {
    return {
      id: point.id,
      label: point.label,
      caption: isCollectedItemResource ? '已搜索 / 资源已采集' : '已搜索',
      glyph: markerGlyphByType[point.type],
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      mapX: point.x,
      mapY: point.y,
      xPercent: clampPercent((point.x / maxX) * 100),
      yPercent: clampPercent((point.y / maxY) * 100),
      feedbackTone: 'default',
      state: 'disabled',
    };
  }

  if (isCompletedEvent) {
    return {
      id: point.id,
      label: point.label,
      caption: '事件已完成',
      glyph: markerGlyphByType[point.type],
      typeLabel: humanizeToken(point.type),
      type: point.type,
      targetId: point.targetId,
      enabled: false,
      mapX: point.x,
      mapY: point.y,
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
    mapX: point.x,
    mapY: point.y,
    xPercent: clampPercent((point.x / maxX) * 100),
    yPercent: clampPercent((point.y / maxY) * 100),
  } as const;

  switch (point.type) {
    case 'npc':
      return { ...baseMarker, caption: '对话 / 信任', feedbackTone: 'success', state: 'focus' };
    case 'shop':
      return { ...baseMarker, caption: '交易 / 补给', feedbackTone: 'success', state: 'focus' };
    case 'portal':
      return {
        ...baseMarker,
        caption:
          point.travelMode === 'teleport'
            ? '立即传送'
            : isHiddenRoute
              ? '隐秘通路'
              : '切换区域',
        feedbackTone: point.travelMode === 'teleport' ? 'warning' : 'info',
        state: 'focus',
      };
    case 'battle':
      return { ...baseMarker, caption: '接近后进入战斗', feedbackTone: 'warning', state: 'alert' };
    case 'event':
      return {
        ...baseMarker,
        caption: isPendingEvent ? '待触发事件' : '已记录事件',
        feedbackTone: isPendingEvent ? 'warning' : 'info',
        state: isPendingEvent ? 'alert' : 'focus',
      };
    case 'item':
    default:
      return { ...baseMarker, caption: '搜索并收集', feedbackTone: 'default', state: 'idle' };
  }
};

const buildSceneMarkerWithEventState = (
  point: Area['interactionPoints'][number],
  maxX: number,
  maxY: number,
  pendingEventIds: string[],
  accessContext: MarkerAccessContext,
): AreaSceneMarker => {
  const baseMarker = buildSceneMarker(
    point,
    maxX,
    maxY,
    pendingEventIds,
    accessContext,
  );

  if (point.type !== 'event') {
    return baseMarker;
  }

  const eventId = point.targetId ?? point.id;
  const eventDefinition = accessContext.eventDefinitionsById[eventId];
  const eventDisplayState = buildEventDisplayState(
    eventDefinition,
    {
      currentAreaId: accessContext.currentArea?.id ?? accessContext.mapState.currentAreaId,
      questProgressEntries: accessContext.questProgressEntries,
      playerModel: accessContext.playerModel,
      worldFlags: accessContext.worldFlags,
      eventHistory: accessContext.eventHistory,
      npcStates: Object.values(accessContext.npcStatesById),
      worldRuntime: accessContext.worldRuntime,
      eventDirector: accessContext.eventDirector,
    },
    {
      areasById: accessContext.areasById,
      questDefinitionsById: accessContext.questDefinitionsById,
      npcDefinitionsById: accessContext.npcDefinitionsById,
    },
  );
  const isPendingEvent = pendingEventIds.includes(eventId);
  const isTriggeredEvent = accessContext.eventHistory.some(
    (entry) => entry.eventId === eventId,
  );
  const isCompletedEvent =
    isTriggeredEvent && eventDefinition?.repeatable === false;

  if (isCompletedEvent) {
    return {
      ...baseMarker,
      caption: '事件已完成',
      feedbackTone: 'default',
      state: 'disabled',
      enabled: false,
    };
  }

  if (isPendingEvent) {
    return {
      ...baseMarker,
      caption: '待触发事件',
      feedbackTone: 'warning',
      state: 'alert',
    };
  }

  if (eventDisplayState.naturallyTriggerable) {
    return {
      ...baseMarker,
      caption: '当前可触发事件',
      feedbackTone: 'info',
      state: 'focus',
    };
  }

  return {
    ...baseMarker,
    caption: eventDisplayState.naturalReason ?? '当前不可触发',
    feedbackTone: 'default',
    state: 'idle',
  };
};

const buildExplorationSignalMarker = (
  signal: ExplorationEncounterSignal,
  maxX: number,
  maxY: number,
): AreaSceneMarker => ({
  id: signal.id,
  label: signal.label,
  caption:
    signal.trigger === 'on-search'
      ? '搜索后暴露伏击'
      : signal.trigger === 'on-enter'
        ? '靠近后触发战斗'
        : '警戒升级后出现',
  glyph: '伏',
  typeLabel: '伏击信号',
  type: 'battle',
  targetId: signal.encounterId,
  enabled: signal.status === 'pending',
  mapX: signal.x,
  mapY: signal.y,
  xPercent: clampPercent((signal.x / maxX) * 100),
  yPercent: clampPercent((signal.y / maxY) * 100),
  feedbackTone: 'warning',
  state: signal.status === 'pending' ? 'alert' : 'disabled',
});

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
  const maxX = Math.max(
    12,
    (currentArea?.scene.grid.width ?? 13) - 1,
    ...scenePoints.map((point) => point.x),
  );
  const maxY = Math.max(
    8,
    (currentArea?.scene.grid.height ?? 9) - 1,
    ...scenePoints.map((point) => point.y),
  );
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
        objective: objective?.label ?? '等待新的目标',
        progress: `${progress.completedObjectiveIds.length}/${questSteps.length} 项`,
      };
    });

  const currentAreaEvents = (currentArea?.eventIds ?? []).map((eventId) => {
    const event = eventDefinitionsById[eventId];
    const pending = source.eventDirector.pendingEventIds.includes(eventId);
    const triggered = source.eventHistory.some((entry) => entry.eventId === eventId);
    const displayState = buildEventDisplayState(
      event,
      {
        currentAreaId: currentArea?.id ?? source.mapState.currentAreaId,
        questProgressEntries: source.questProgressEntries,
        playerModel: source.playerModel,
        worldFlags: source.worldFlags,
        eventHistory: source.eventHistory,
        npcStates: source.npcStates,
        worldRuntime: source.worldRuntime,
        eventDirector: source.eventDirector,
      },
      {
        areasById,
        questDefinitionsById,
        npcDefinitionsById,
      },
    );

    return {
      id: eventId,
      title: event?.title ?? humanizeToken(eventId),
      detail: event?.description ?? '该事件尚未提供详细说明。',
      isPending: pending,
      isTriggered: triggered,
      naturallyTriggerable: displayState.naturallyTriggerable,
      naturalReason: displayState.naturalReason,
    };
  });

  const pendingEventIds = currentAreaEvents
    .filter((event) => event.isPending)
    .map((event) => event.id);
  const currentAreaSignals = source.explorationState.signals.filter(
    (signal) => signal.areaId === currentArea?.id && signal.status === 'pending',
  );
  const stageMarkers = [
    ...scenePoints.map((point) =>
      buildSceneMarkerWithEventState(point, maxX, maxY, pendingEventIds, {
        currentArea,
        areasById,
        mapState: source.mapState,
        explorationState: source.explorationState,
        questProgressEntries: source.questProgressEntries,
        questDefinitionsById,
        worldFlags: source.worldFlags,
        npcStatesById,
        npcDefinitionsById,
        playerModel: source.playerModel,
        worldRuntime: source.worldRuntime,
        eventDefinitionsById,
        eventHistory: source.eventHistory,
        eventDirector: source.eventDirector,
      }),
    ),
    ...currentAreaSignals.map((signal) =>
      buildExplorationSignalMarker(signal, maxX, maxY),
    ),
  ];
  const stageModel = areaSceneStageModelSchema.parse({
    rendererLabel: '像素场景渲染',
    backgroundLabel: currentArea?.backgroundKey
      ? `${humanizeToken(currentArea.backgroundKey)}`
      : `${humanizeToken(currentArea?.type)}场景`,
    engineTargets: ['像素舞台演示', '分层地图渲染'],
    highlightSummary: pendingEventIds.length
      ? `当前有 ${pendingEventIds.length} 个待处理事件焦点`
      : stageMarkers.some((marker) => marker.type === 'battle')
        ? '区域内存在可触发战斗信号'
        : '区域状态稳定，可继续探索',
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
  const renderScene = buildPixelSceneRenderModel({
    area: currentArea,
    areaTypeLabel: humanizeToken(currentArea?.type),
    markers: stageMarkers,
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
        disposition: formatNpcDispositionLabel(npcState.currentDisposition),
        emotionalState: formatNpcEmotionalStateLabel(npcState.emotionalState),
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
      emotionalState: relationship.emotionalState,
    }));

  const enemyAlerts = [
    ...currentAreaSignals.map((signal) => ({
      id: `signal:${signal.id}`,
      label: signal.label,
      detail: signal.enemyArchetype
        ? `${humanizeToken(signal.trigger)} · ${humanizeToken(signal.enemyArchetype)} · 伏击信号已锁定`
        : `${humanizeToken(signal.trigger)} · 已暴露伏击信号`,
      tone: 'warning' as const,
    })),
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
            label: `${source.combatState.enemy.name} 正在交战`,
            detail: `第 ${source.combatState.turn} 回合 · 敌方生命 ${source.combatState.enemy.hp}/${source.combatState.enemy.maxHp} · 当前战术 ${humanizeToken(source.combatState.activeTactic)}`,
            tone: 'warning' as const,
          },
        ]
      : []),
    ...source.combatEncounters
      .filter((encounter) => encounter.areaId === currentArea?.id)
      .map((encounter) => ({
        id: encounter.id,
        label: encounter.title,
        detail: `${humanizeToken(encounter.mode)} · 战术池 ${encounter.tacticPool.length} 种`,
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
    ...buildPlayerGuidanceHints(source.playerModel),
    ...source.playerModel.rationale.slice(0, 2).map((summary, index) => ({
      id: `player-model:${index}`,
      title: index === 0 ? '玩家模型' : '行为偏好',
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
            title: '节奏提示',
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
      currentArea: currentArea?.name ?? '未进入区域',
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
            ? '当前位置'
            : source.mapState.unlockedAreaIds.includes(area.id)
              ? '已解锁'
              : source.mapState.discoveredAreaIds.includes(area.id)
                ? '已发现'
                : '未发现',
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
          label: '已发现区域',
          value: `${source.mapState.discoveredAreaIds.length}/${source.areas.length}`,
        },
        {
          label: '已解锁区域',
          value: `${source.mapState.unlockedAreaIds.length}/${source.areas.length}`,
        },
        {
          label: '访问次数',
          value: `${source.mapState.visitHistory.length}`,
        },
      ],
      areaSummary: currentArea
        ? `${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)} · 资源节点 ${currentArea.resourceNodes.length} · 敌对规则 ${currentArea.enemySpawnRules.length}`
        : '尚未进入区域，可从左侧列表选择目的地。',
    },
    scene: {
      areaName: currentArea?.name ?? '未进入区域',
      areaType: humanizeToken(currentArea?.type),
      description: currentArea
        ? `${currentArea.description} 当前环境：${currentAreaEnvironment?.label ?? humanizeToken(currentArea.type)}`
        : '尚未进入任何区域，请先选择一个可探索区域。',
      sceneStatus: `${stageModel.layers.length} 个图层 · ${stageModel.markers.length} 个标记 · ${currentAreaEvents.length} 个事件 · ${currentArea?.resourceNodes.length ?? 0} 个资源点 · ${currentArea?.enemySpawnRules.length ?? 0} 条敌对规则`,
      stage: stageModel,
      renderScene,
      npcs: (currentArea?.npcIds ?? []).map((npcId) => {
        const definition = npcDefinitionsById[npcId];
        const runtime = npcStatesById[npcId];

        return {
          id: npcId,
          name: definition?.name ?? humanizeToken(npcId),
          role: humanizeToken(definition?.role),
          disposition: runtime
            ? formatNpcDispositionLabel(runtime.currentDisposition)
            : '未知',
          emotionalState: runtime
            ? formatNpcEmotionalStateLabel(runtime.emotionalState)
            : '未知',
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
              objective: '继续探索地图、与角色交流或推进主线。',
              progress: '0/0 项',
            },
          ],
      inventory: source.player.inventory.map((item) => ({
        id: item.itemId,
        label: humanizeToken(item.itemId),
        quantity: item.quantity,
      })),
      playerStatus: [
        {
          label: '玩家生命',
          value: `${source.player.hp}/${source.player.maxHp}`,
        },
        {
          label: '能量',
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
              label: '区域敌情稳定',
              detail: '当前没有发现新的敌对动向，可以继续探索、搜集或与角色互动。',
              tone: 'success',
            },
          ],
    },
    logs: logs.length
      ? logs
        : [
            {
              id: 'log:none',
              label: '暂无日志',
              detail: '关键行动、战斗和事件会按时间顺序记录在这里。',
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
              title: '继续探索',
              summary: '可优先查看地图标记、敌情提示和底部操作栏，快速进入下一步流程。',
              tone: 'default',
            },
          ],
  };
}
