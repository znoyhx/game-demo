import type {
  AppSessionState,
  Area,
  DebugToolsState,
  EnemyTacticianInput,
  EnemyTacticianOutput,
  EventLogEntry,
  ExplainCoachInput,
  ExplainCoachOutput,
  ExplorationState,
  GameConfigState,
  GameMasterInput,
  GameMasterOutput,
  GameUiState,
  LevelBuilderInput,
  LevelBuilderOutput,
  MapState,
  NpcBrainInput,
  NpcBrainOutput,
  NpcDefinition,
  NpcState,
  PlayerModelState,
  PlayerModelInput,
  PlayerModelOutput,
  PlayerState,
  QuestDefinition,
  QuestDesignerInput,
  QuestDesignerOutput,
  ResourceState,
  ReviewState,
  QuestProgress,
  SaveSnapshot,
  SessionSnapshot,
  World,
  WorldArchitectInput,
  WorldArchitectOutput,
  WorldEvent,
} from '../../src/core/schemas';
import {
  mockAppSessionState,
  mockAreas,
  mockBossCombatState,
  mockBossEncounterDefinition,
  mockCombatHistory,
  mockDebugToolsState,
  mockEventHistory,
  mockGameConfig,
  mockGameUiState,
  mockIds,
  mockNpcDefinitions,
  mockNpcStates,
  mockPlayerModelState,
  mockPlayerState,
  mockQuestDefinitions,
  mockQuestProgress,
  mockResourceState,
  mockReviewPayload,
  mockReviewState,
  mockSaveSnapshot,
  mockSessionSnapshot,
  mockTimeline,
  mockWorld,
  mockWorldEvents,
} from '../../src/core/mocks/mvp';

export const sampleTimestamp = mockTimeline.worldCreatedAt;

export const sampleWorld: World = mockWorld;
export const sampleArea: Area = mockAreas[0];
export const sampleMapState: MapState = mockSaveSnapshot.map!;
export const sampleQuestDefinition: QuestDefinition = mockQuestDefinitions[0];
export const sampleQuestProgress: QuestProgress = mockQuestProgress[0];
export const sampleNpcDefinition: NpcDefinition = mockNpcDefinitions[0];
export const sampleNpcState: NpcState = mockNpcStates[0];
export const samplePlayerState: PlayerState = mockPlayerState;
export const samplePlayerModelState: PlayerModelState = mockPlayerModelState;
export const sampleWorldEvent: WorldEvent = mockWorldEvents[0];
export const sampleEventLogEntry: EventLogEntry = mockEventHistory[0];
export const sampleCombatEncounterDefinition = mockBossEncounterDefinition;
export const sampleCombatState = mockBossCombatState;
export const sampleExplorationState: ExplorationState = mockSaveSnapshot.exploration!;
export const sampleReviewPayload = mockReviewPayload;
export const sampleReviewState: ReviewState = mockReviewState;
export const sampleSaveSnapshot: SaveSnapshot = mockSaveSnapshot;
export const sampleGameConfigState: GameConfigState = mockGameConfig;
export const sampleResourceState: ResourceState = mockResourceState;
export const sampleGameUiState: GameUiState = mockGameUiState;
export const sampleDebugToolsState: DebugToolsState = mockDebugToolsState;
export const sampleAppSessionState: AppSessionState = mockAppSessionState;
export const sampleSessionSnapshot: SessionSnapshot = mockSessionSnapshot;

export const sampleWorldArchitectInput: WorldArchitectInput = {
  theme: sampleWorld.summary.theme,
  worldStyle: sampleGameConfigState.worldStyle,
  preferredMode: sampleWorld.summary.mode,
  difficulty: 'normal',
  gameGoal: sampleGameConfigState.gameGoal,
  learningGoal: sampleGameConfigState.learningGoal,
  quickStartEnabled: sampleGameConfigState.quickStartEnabled,
  devModeEnabled: sampleGameConfigState.devModeEnabled,
  promptStyle: 'mvp-pack',
};

export const sampleWorldArchitectOutput: WorldArchitectOutput = {
  world: sampleWorld,
  areas: mockAreas,
  factions: sampleWorld.factions,
  storyPremise: sampleGameConfigState.storyPremise!,
};

export const sampleQuestDesignerInput: QuestDesignerInput = {
  world: sampleWorld,
  areas: mockAreas,
  npcDefinitions: mockNpcDefinitions,
  gameGoal: sampleGameConfigState.gameGoal,
  learningGoal: sampleGameConfigState.learningGoal,
  storyPremise: sampleGameConfigState.storyPremise!,
  questCount: {
    main: 1,
    side: 3,
  },
};

export const sampleQuestDesignerOutput: QuestDesignerOutput = {
  quests: mockQuestDefinitions,
};

export const sampleLevelBuilderInput: LevelBuilderInput = {
  area: sampleArea,
  world: sampleWorld,
  questContext: mockQuestDefinitions,
};

export const sampleLevelBuilderOutput: LevelBuilderOutput = {
  area: sampleArea,
  interactionPoints: sampleArea.interactionPoints,
};

export const sampleNpcBrainInput: NpcBrainInput = {
  npcDefinition: sampleNpcDefinition,
  npcState: sampleNpcState,
  questDefinitions: mockQuestDefinitions,
  questProgressEntries: mockQuestProgress,
  playerState: samplePlayerState,
  playerModel: samplePlayerModelState,
  recentDialogue: [
    {
      speaker: 'player',
      text: '沉没秘库那条路真的还能把圣所打开吗？',
    },
    {
      speaker: 'npc',
      text: '可以，但你得先把中继核心重新接上，别让封印彻底硬化。',
    },
  ],
};

export const sampleNpcBrainOutput: NpcBrainOutput = {
  npcReply: '带上罗文，把中继重新点亮，然后再去面对灰烬守卫。',
  trustDelta: 4,
  relationshipDelta: 6,
  memoryNote: '莱拉记下了玩家继续沿秘库路线推进。',
  longTermMemoryNote: '莱拉判断玩家正在稳住前线协作链路。',
  questOfferIds: [mockIds.quests.sidePatrol],
  itemTransfers: [],
  playerGoldDelta: 0,
  relationshipNetworkChanges: [
    {
      targetNpcId: mockIds.npcs.rowan,
      delta: 6,
      bond: '协防链路',
    },
  ],
  decisionBasis: [
    '当前交互意图是任务',
    '玩家近期到过沉没秘库，相关线索会影响回答',
  ],
  explanationHint: '莱拉根据秘库推进、玩家历史与当前语气给出了更明确的回应。',
};

export const sampleEnemyTacticianInput: EnemyTacticianInput = {
  encounter: sampleCombatEncounterDefinition,
  combatState: sampleCombatState,
  playerState: samplePlayerState,
  playerTags: samplePlayerState.profileTags,
  commonPlayerActions: ['attack', 'special', 'attack'],
  environmentState: {
    areaId: mockIds.areas.sanctum,
    label: '余烬风暴',
    hazard: 'volatile',
    weather: '余烬雨',
    lighting: '炽红裂隙',
  },
  bossPhaseId: sampleCombatState.currentPhaseId,
};

export const sampleEnemyTacticianOutput: EnemyTacticianOutput = {
  selectedTactic: 'counter',
  reason: '玩家近期偏好正面强压，适合用反制手段惩罚常用输出节奏。',
};

export const sampleGameMasterInput: GameMasterInput = {
  currentAreaId: samplePlayerState.currentAreaId,
  activeQuestIds: mockQuestProgress
    .filter((entry) => entry.status === 'active')
    .map((entry) => entry.questId),
  triggeredEvents: mockEventHistory,
  playerTags: samplePlayerState.profileTags,
  worldFlags: sampleWorld.flags,
  worldTension: mockSaveSnapshot.events.director.worldTension,
  timeOfDay: sampleWorld.timeOfDay,
  availableEvents: mockWorldEvents,
  pendingEvents: mockSaveSnapshot.events.director.scheduledEvents,
};

export const sampleGameMasterOutput: GameMasterOutput = {
  eventToTrigger: mockIds.events.wardenCountermeasure,
  scheduledEvents: [
    {
      eventId: mockIds.events.marketPanic,
      scheduledBy: 'game-master',
      reason: '前哨市场张力偏高，应先排入补给抬价事件。',
    },
  ],
  pacingNote: '秘库路线稳定后，继续把圣所反制压力往上提。',
  worldTensionDelta: 6,
};

export const samplePlayerModelInput: PlayerModelInput = {
  recentAreaVisits: [mockIds.areas.crossroads, mockIds.areas.archive],
  recentCombatActions: ['attack', 'guard', 'special'],
  recentNpcInteractionIntents: ['ask', 'quest', 'trade'],
  recentQuestChoices: ['branch:main-trust-rowan'],
  combatSummary: sampleCombatState,
  combatHistory: mockCombatHistory,
  npcInteractionCount: 4,
  activeQuestCount: mockQuestProgress.filter((entry) => entry.status === 'active').length,
  completedQuestCount: mockQuestProgress.filter((entry) => entry.status === 'completed').length,
  signalWeights: samplePlayerModelState.signalWeights,
};

export const samplePlayerModelOutput: PlayerModelOutput = {
  tags: ['exploration', 'story', 'risky'],
  rationale: ['玩家偏好探索路径、支线对话，并愿意在战斗中持续向前施压。'],
};

export const sampleExplainCoachInput: ExplainCoachInput = {
  player: samplePlayerState,
  playerModel: samplePlayerModelState,
  difficulty: sampleGameConfigState.difficulty,
  reviewRequest: {
    trigger: 'combat',
  },
  reviewHistory: [mockReviewPayload],
  encounter: sampleCombatEncounterDefinition,
  combat: sampleCombatState,
  combatHistory: mockCombatHistory,
  questProgress: mockQuestProgress,
  eventHistory: mockEventHistory,
};

export const sampleExplainCoachOutput: ExplainCoachOutput = {
  review: mockReviewPayload,
};
