import type {
  Area,
  EnemyTacticianInput,
  EnemyTacticianOutput,
  EventLogEntry,
  ExplainCoachInput,
  ExplainCoachOutput,
  GameMasterInput,
  GameMasterOutput,
  LevelBuilderInput,
  LevelBuilderOutput,
  NpcBrainInput,
  NpcBrainOutput,
  NpcDefinition,
  NpcState,
  PlayerModelInput,
  PlayerModelOutput,
  PlayerState,
  QuestDefinition,
  QuestDesignerInput,
  QuestDesignerOutput,
  QuestProgress,
  SaveSnapshot,
  World,
  WorldArchitectInput,
  WorldArchitectOutput,
  WorldEvent,
} from '../../src/core/schemas';
import {
  mockAreas,
  mockBossCombatState,
  mockBossEncounterDefinition,
  mockEventHistory,
  mockIds,
  mockNpcDefinitions,
  mockNpcStates,
  mockPlayerState,
  mockQuestDefinitions,
  mockQuestProgress,
  mockReviewPayload,
  mockSaveSnapshot,
  mockTimeline,
  mockWorld,
  mockWorldEvents,
} from '../../src/core/mocks/mvp';

export const sampleTimestamp = mockTimeline.worldCreatedAt;

export const sampleWorld: World = mockWorld;
export const sampleArea: Area = mockAreas[0];
export const sampleQuestDefinition: QuestDefinition = mockQuestDefinitions[0];
export const sampleQuestProgress: QuestProgress = mockQuestProgress[0];
export const sampleNpcDefinition: NpcDefinition = mockNpcDefinitions[0];
export const sampleNpcState: NpcState = mockNpcStates[0];
export const samplePlayerState: PlayerState = mockPlayerState;
export const sampleWorldEvent: WorldEvent = mockWorldEvents[0];
export const sampleEventLogEntry: EventLogEntry = mockEventHistory[0];
export const sampleCombatEncounterDefinition = mockBossEncounterDefinition;
export const sampleCombatState = mockBossCombatState;
export const sampleReviewPayload = mockReviewPayload;
export const sampleSaveSnapshot: SaveSnapshot = mockSaveSnapshot;

export const sampleWorldArchitectInput: WorldArchitectInput = {
  theme: sampleWorld.summary.theme,
  preferredMode: sampleWorld.summary.mode,
  difficulty: 'normal',
  promptStyle: 'mvp-pack',
};

export const sampleWorldArchitectOutput: WorldArchitectOutput = {
  world: sampleWorld,
  areas: mockAreas,
  factions: sampleWorld.factions,
};

export const sampleQuestDesignerInput: QuestDesignerInput = {
  world: sampleWorld,
  areas: mockAreas,
  npcDefinitions: mockNpcDefinitions,
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
  activeQuests: mockQuestProgress.filter((entry) => entry.status === 'active'),
  playerState: samplePlayerState,
  recentDialogue: [
    {
      speaker: 'player',
      text: 'Can the archive route really open the sanctum?',
    },
    {
      speaker: 'npc',
      text: 'It can, if the relay core is restored before the seal hardens again.',
    },
  ],
};

export const sampleNpcBrainOutput: NpcBrainOutput = {
  npcReply: 'Take Rowan with you and restore the relay before you face the Ash Warden.',
  updatedDisposition: 'friendly',
  trustDelta: 4,
  relationshipDelta: 6,
  unlockedQuestIds: [mockIds.quests.sidePatrol],
  explanationHint: 'Lyra trusts the player after the archive progress and supply delivery.',
};

export const sampleEnemyTacticianInput: EnemyTacticianInput = {
  encounter: sampleCombatEncounterDefinition,
  combatState: sampleCombatState,
  playerTags: samplePlayerState.profileTags,
};

export const sampleEnemyTacticianOutput: EnemyTacticianOutput = {
  selectedTactic: 'counter',
  reason: 'The player profile trends risky, so the boss reacts with counter-heavy pressure.',
};

export const sampleGameMasterInput: GameMasterInput = {
  currentAreaId: samplePlayerState.currentAreaId,
  activeQuestIds: mockQuestProgress
    .filter((entry) => entry.status === 'active')
    .map((entry) => entry.questId),
  triggeredEvents: mockEventHistory,
  playerTags: samplePlayerState.profileTags,
};

export const sampleGameMasterOutput: GameMasterOutput = {
  eventToTrigger: mockIds.events.wardenCountermeasure,
  pacingNote: 'Escalate tension with the sanctum countermeasure once the archive route is stable.',
};

export const samplePlayerModelInput: PlayerModelInput = {
  recentAreaVisits: [mockIds.areas.crossroads, mockIds.areas.archive],
  recentQuestChoices: ['branch:main-trust-rowan'],
  combatSummary: sampleCombatState,
  npcInteractionCount: 4,
};

export const samplePlayerModelOutput: PlayerModelOutput = {
  tags: ['exploration', 'story', 'risky'],
  rationale: ['The player favors route discovery, side conversations, and direct combat pressure.'],
};

export const sampleExplainCoachInput: ExplainCoachInput = {
  player: samplePlayerState,
  combat: sampleCombatState,
  questProgress: mockQuestProgress,
  eventHistory: mockEventHistory,
};

export const sampleExplainCoachOutput: ExplainCoachOutput = {
  review: mockReviewPayload,
};
