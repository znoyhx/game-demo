---

## `docs/contracts.md`

```md
# PixelForge Agent Contracts
Version: v0.2  
Status: Initial contract draft

---

# 1. Purpose

This document defines the initial domain contracts for PixelForge Agent.

Goals:
- provide stable shared shapes across modules
- reduce coupling between UI, controllers, rules, agents, and persistence
- support mock-first development
- enable schema validation and save compatibility
- define the minimum interfaces required for MVP delivery

This file is implementation-oriented and should evolve with the codebase.

---

# 2. Contract Principles

1. All important domain boundaries must use typed contracts.
2. All generated or restored data must be validated before entering state.
3. Save contracts require versioning.
4. Agent contracts must define both input and output.
5. Contracts should be stable enough for tests, mocks, and debug tools.

---

# 3. Core Domain Contracts

---

## 3.1 ID Types

These are logical identifiers used throughout the system.

```ts
export type WorldId = string;
export type AreaId = string;
export type QuestId = string;
export type NpcId = string;
export type EventId = string;
export type EncounterId = string;
export type SaveId = string;
export type FactionId = string;
export type ItemId = string;
````

---

## 3.2 Timestamp and Version Types

```ts
export type IsoTimestamp = string; // ISO-8601 string
export type SchemaVersion = string; // e.g. "0.1.0"
```

---

# 4. World Contracts

## 4.1 World Summary

```ts
export interface WorldSummary {
  id: WorldId;
  name: string;
  subtitle?: string;
  theme: string;
  tone: "light" | "neutral" | "dark" | "mysterious";
  mode: "story" | "exploration" | "combat" | "hybrid";
  createdAt: IsoTimestamp;
}
```

## 4.2 Faction

```ts
export interface Faction {
  id: FactionId;
  name: string;
  description: string;
  stance: "friendly" | "neutral" | "hostile" | "hidden";
}
```

## 4.3 World Flags

```ts
export interface WorldFlags {
  tutorialCompleted?: boolean;
  bossUnlocked?: boolean;
  finalAreaUnlocked?: boolean;
  emergencyState?: boolean;
  [key: string]: boolean | undefined;
}
```

## 4.4 World Contract

```ts
export interface World {
  summary: WorldSummary;
  factions: Faction[];
  areaIds: AreaId[];
  startingAreaId: AreaId;
  weather?: string;
  timeOfDay?: string;
  flags: WorldFlags;
}
```

---

# 5. Area Contracts

## 5.1 Area Type

```ts
export type AreaType =
  | "town"
  | "wilderness"
  | "dungeon"
  | "ruin"
  | "shop"
  | "boss"
  | "hidden";
```

## 5.2 Interaction Point

```ts
export interface InteractionPoint {
  id: string;
  label: string;
  type: "npc" | "item" | "portal" | "event" | "shop" | "battle";
  x: number;
  y: number;
  targetId?: string;
  enabled?: boolean;
}
```

## 5.3 Area Unlock Condition

```ts
export interface AreaUnlockCondition {
  requiredQuestIds?: QuestId[];
  requiredWorldFlags?: string[];
  requiredNpcTrust?: Array<{
    npcId: NpcId;
    minTrust: number;
  }>;
}
```

## 5.4 Area Contract

```ts
export interface Area {
  id: AreaId;
  name: string;
  type: AreaType;
  description: string;
  difficulty: number;
  unlockedByDefault: boolean;
  unlockCondition?: AreaUnlockCondition;
  npcIds: NpcId[];
  interactionPoints: InteractionPoint[];
  eventIds: EventId[];
  connectedAreaIds: AreaId[];
  backgroundKey?: string;
  musicKey?: string;
}
```

---

# 6. Quest Contracts

## 6.1 Quest Type

```ts
export type QuestType =
  | "main"
  | "side"
  | "hidden"
  | "tutorial"
  | "dynamic";
```

## 6.2 Quest Status

```ts
export type QuestStatus =
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "failed";
```

## 6.3 Quest Reward

```ts
export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: ItemId[];
  unlockAreaIds?: AreaId[];
  worldFlags?: string[];
}
```

## 6.4 Quest Branch Result

```ts
export interface QuestBranchResult {
  id: string;
  label: string;
  description: string;
  reward?: QuestReward;
  setsWorldFlags?: string[];
  changesNpcRelation?: Array<{
    npcId: NpcId;
    delta: number;
  }>;
}
```

## 6.5 Quest Objective

```ts
export interface QuestObjective {
  id: string;
  label: string;
  type: "talk" | "visit" | "collect" | "battle" | "trigger";
  targetId?: string;
  requiredCount?: number;
}
```

## 6.6 Quest Definition

```ts
export interface QuestDefinition {
  id: QuestId;
  type: QuestType;
  title: string;
  description: string;
  giverNpcId?: NpcId;
  unlockCondition?: {
    requiredQuestIds?: QuestId[];
    requiredWorldFlags?: string[];
  };
  objectives: QuestObjective[];
  reward?: QuestReward;
  failureCondition?: string;
  branchResults?: QuestBranchResult[];
}
```

## 6.7 Quest Progress

```ts
export interface QuestProgress {
  questId: QuestId;
  status: QuestStatus;
  currentObjectiveIndex: number;
  completedObjectiveIds: string[];
  chosenBranchId?: string;
  updatedAt: IsoTimestamp;
}
```

---

# 7. NPC Contracts

## 7.1 NPC Role and Disposition

```ts
export type NpcRole =
  | "guide"
  | "merchant"
  | "villager"
  | "scholar"
  | "guard"
  | "enemy"
  | "boss"
  | "mystic";

export type NpcDisposition =
  | "friendly"
  | "neutral"
  | "suspicious"
  | "hostile"
  | "afraid"
  | "secretive";
```

## 7.2 NPC Memory Summary

```ts
export interface NpcMemorySummary {
  shortTerm: string[];
  longTerm: string[];
  lastInteractionAt?: IsoTimestamp;
}
```

## 7.3 NPC Revealable Info

```ts
export interface NpcRevealableInfo {
  publicFacts: string[];
  trustGatedFacts: Array<{
    minTrust: number;
    fact: string;
  }>;
  hiddenSecrets: string[];
}
```

## 7.4 NPC Definition

```ts
export interface NpcDefinition {
  id: NpcId;
  name: string;
  role: NpcRole;
  factionId?: FactionId;
  areaId: AreaId;
  personalityTags: string[];
  baseDisposition: NpcDisposition;
  avatarKey?: string;
}
```

## 7.5 NPC Runtime State

```ts
export interface NpcState {
  npcId: NpcId;
  relationship: number; // suggested range: -100 to 100
  trust: number; // suggested range: 0 to 100
  currentDisposition: NpcDisposition;
  memory: NpcMemorySummary;
  revealableInfo: NpcRevealableInfo;
  currentGoal?: string;
  hasGivenQuestIds: QuestId[];
  flags?: Record<string, boolean>;
}
```

## 7.6 NPC Dialogue Option

```ts
export interface NpcDialogueOption {
  id: string;
  label: string;
  intent:
    | "greet"
    | "ask"
    | "trade"
    | "quest"
    | "persuade"
    | "leave";
}
```

## 7.7 NPC Dialogue Turn

```ts
export interface NpcDialogueTurn {
  speaker: "player" | "npc" | "system";
  text: string;
}
```

---

# 8. Player Contracts

## 8.1 Player Profile Tag

```ts
export type PlayerProfileTag =
  | "exploration"
  | "combat"
  | "story"
  | "social"
  | "speedrun"
  | "cautious"
  | "risky";
```

## 8.2 Player Inventory Entry

```ts
export interface PlayerInventoryEntry {
  itemId: ItemId;
  quantity: number;
}
```

## 8.3 Player State

```ts
export interface PlayerState {
  hp: number;
  maxHp: number;
  energy?: number;
  gold: number;
  inventory: PlayerInventoryEntry[];
  profileTags: PlayerProfileTag[];
  currentAreaId: AreaId;
}
```

## 8.4 Player Model State

```ts
export interface PlayerModelState {
  tags: PlayerProfileTag[];
  rationale: string[];
  recentAreaVisits: AreaId[];
  recentQuestChoices: string[];
  npcInteractionCount: number;
  dominantStyle?: PlayerProfileTag;
  riskForecast?: string;
  stuckPoint?: string;
  lastUpdatedAt?: IsoTimestamp;
}
```

---

# 8.5 World Creation Contracts

## 8.5.1 World Creation Request

```ts
export interface WorldCreationRequest {
  theme: string;
  worldStyle: string;
  difficulty: "easy" | "normal" | "hard";
  gameGoal: string;
  learningGoal?: string;
  preferredMode: "story" | "exploration" | "combat" | "hybrid";
  templateId?: string;
  quickStartEnabled: boolean;
  devModeEnabled: boolean;
  autosaveEnabled: boolean;
  autoLoadEnabled: boolean;
  presentationModeEnabled: boolean;
  promptStyle?: string;
  saveAfterCreate?: boolean;
}
```

## 8.5.2 World Creation Result

```ts
export interface WorldCreationResult {
  snapshot: SaveSnapshot;
  outputs: {
    worldName: string;
    regionNames: string[];
    factionNames: string[];
    mainQuestSeed: string;
    npcNames: string[];
    resourceLabels: string[];
    storyPremise: string;
  };
  usedFallback: boolean;
  fallbackReason?:
    | "world-architect-failed"
    | "quest-designer-failed"
    | "level-builder-failed"
    | "npc-pack-failed"
    | "event-pack-failed"
    | "resource-pack-failed"
    | "snapshot-invalid";
}
```

---

# 9. Event Contracts

## 9.1 Event Trigger Type

```ts
export type EventTriggerType =
  | "manual"
  | "time"
  | "location"
  | "quest"
  | "relationship"
  | "playerModel"
  | "balance";
```

## 9.2 Event Trigger Condition

```ts
export interface EventTriggerCondition {
  type: EventTriggerType;
  requiredAreaId?: AreaId;
  requiredQuestId?: QuestId;
  requiredNpcId?: NpcId;
  requiredPlayerTag?: PlayerProfileTag;
  requiredWorldFlag?: string;
}
```

## 9.3 Event Effect

```ts
export interface EventEffect {
  setWorldFlags?: string[];
  unlockAreaIds?: AreaId[];
  startQuestIds?: QuestId[];
  updateNpcTrust?: Array<{
    npcId: NpcId;
    delta: number;
  }>;
}
```

## 9.4 World Event

```ts
export interface WorldEvent {
  id: EventId;
  title: string;
  description: string;
  triggerConditions: EventTriggerCondition[];
  effects: EventEffect;
  repeatable: boolean;
}
```

## 9.5 Event Log Entry

```ts
export interface EventLogEntry {
  eventId: EventId;
  triggeredAt: IsoTimestamp;
  source: EventTriggerType | "debug";
}
```

---

# 10. Combat Contracts

## 10.1 Combat Mode

```ts
export type CombatMode = "turn-based" | "semi-realtime";
```

## 10.2 Enemy Tactic Type

```ts
export type EnemyTacticType =
  | "aggressive"
  | "defensive"
  | "counter"
  | "trap"
  | "summon"
  | "resource-lock";
```

## 10.3 Combatant Snapshot

```ts
export interface CombatantSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  statusEffects?: string[];
}
```

## 10.4 Boss Phase

```ts
export interface BossPhase {
  id: string;
  label: string;
  thresholdType: "hp" | "turn";
  thresholdValue: number;
  tacticBias?: EnemyTacticType[];
}
```

## 10.5 Combat Encounter Definition

```ts
export interface CombatEncounterDefinition {
  id: EncounterId;
  title: string;
  mode: CombatMode;
  areaId: AreaId;
  enemyNpcId?: NpcId;
  tacticPool: EnemyTacticType[];
  bossPhases?: BossPhase[];
}
```

## 10.6 Combat Turn Action

```ts
export interface CombatTurnAction {
  actor: "player" | "enemy" | "system";
  actionType: string;
  description: string;
  value?: number;
}
```

## 10.7 Combat Log Entry

```ts
export interface CombatLogEntry {
  turn: number;
  phaseId?: string;
  activeTactic?: EnemyTacticType;
  actions: CombatTurnAction[];
}
```

## 10.8 Combat Runtime State

```ts
export interface CombatState {
  encounterId: EncounterId;
  turn: number;
  currentPhaseId?: string;
  activeTactic: EnemyTacticType;
  player: CombatantSnapshot;
  enemy: CombatantSnapshot;
  logs: CombatLogEntry[];
  result?: "victory" | "defeat" | "escape";
}
```

---

# 11. Review and Explainability Contracts

## 11.1 Explanation Item

```ts
export interface ExplanationItem {
  type: "npc" | "quest" | "combat" | "playerModel" | "event";
  title: string;
  summary: string;
  evidence?: string[];
}
```

## 11.2 Review Payload

```ts
export interface ReviewPayload {
  generatedAt: IsoTimestamp;
  encounterId?: EncounterId;
  playerTags: PlayerProfileTag[];
  keyEvents: string[];
  explanations: ExplanationItem[];
  suggestions: string[];
}
```

---

# 12. Save Contracts

## 12.1 Save Metadata

```ts
export interface SaveMetadata {
  id: SaveId;
  version: SchemaVersion;
  slot?: string;
  label?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  source: "auto" | "manual" | "debug";
}
```

## 12.2 Save Snapshot

```ts
export interface SaveSnapshot {
  metadata: SaveMetadata;
  world: World;
  areas: Area[];
  map?: {
    currentAreaId: AreaId;
    discoveredAreaIds: AreaId[];
    unlockedAreaIds: AreaId[];
    visitHistory: AreaId[];
  };
  quests: {
    definitions: QuestDefinition[];
    progress: QuestProgress[];
    history?: Array<{
      questId: QuestId;
      status: QuestStatus;
      note: string;
      updatedAt: IsoTimestamp;
    }>;
  };
  npcs: {
    definitions: NpcDefinition[];
    runtime: NpcState[];
  };
  player: PlayerState;
  playerModel?: PlayerModelState;
  events: {
    definitions: WorldEvent[];
    history: EventLogEntry[];
    director?: {
      pendingEventIds: EventId[];
      worldTension: number;
      pacingNote?: string;
      randomnessDisabled: boolean;
    };
  };
  combatSystem?: {
    encounters: CombatEncounterDefinition[];
    active: CombatState | null;
    history: Array<{
      encounterId: EncounterId;
      result: "victory" | "defeat" | "escape";
      finalTactic: EnemyTacticType;
      resolvedAt: IsoTimestamp;
    }>;
  };
  combat?: CombatState | null;
  config?: {
    theme: string;
    worldStyle: string;
    difficulty: "easy" | "normal" | "hard";
    gameGoal: string;
    learningGoal?: string;
    storyPremise?: string;
    preferredMode: "story" | "exploration" | "combat" | "hybrid";
    templateId?: string;
    quickStartEnabled: boolean;
    devModeEnabled: boolean;
    autosaveEnabled: boolean;
    autoLoadEnabled: boolean;
    presentationModeEnabled: boolean;
  };
  resources?: {
    activeTheme: string;
    entries: Array<{
      id: string;
      kind: "tileset" | "background" | "music" | "avatar" | "effect";
      key: string;
      label: string;
      areaId?: AreaId;
      npcId?: NpcId;
      source?: string;
    }>;
    loadedResourceKeys: string[];
    selectedBackgroundKey?: string;
    selectedTilesetKey?: string;
    selectedMusicKey?: string;
  };
  review?: ReviewPayload | null;
  reviewState?: {
    current: ReviewPayload | null;
    history: ReviewPayload[];
  };
}
```

## 12.3 Load Result

```ts
export interface LoadResult {
  ok: boolean;
  snapshot?: SaveSnapshot;
  reason?: "missing" | "invalid" | "corrupt" | "migration-failed";
}
```

---

# 13. Agent Input / Output Contracts

These contracts define the initial structured boundary for agent-like systems.

---

## 13.1 World Architect Agent

### Input

```ts
export interface WorldArchitectInput {
  theme: string;
  worldStyle: string;
  preferredMode: "story" | "exploration" | "combat" | "hybrid";
  difficulty: "easy" | "normal" | "hard";
  gameGoal: string;
  learningGoal?: string;
  quickStartEnabled: boolean;
  devModeEnabled: boolean;
  promptStyle?: string;
}
```

### Output

```ts
export interface WorldArchitectOutput {
  world: World;
  areas: Area[];
  factions: Faction[];
  storyPremise: string;
}
```

---

## 13.2 Quest Designer Agent

### Input

```ts
export interface QuestDesignerInput {
  world: World;
  areas: Area[];
  npcDefinitions: NpcDefinition[];
  gameGoal: string;
  learningGoal?: string;
  storyPremise: string;
  questCount: {
    main: number;
    side: number;
  };
}
```

### Output

```ts
export interface QuestDesignerOutput {
  quests: QuestDefinition[];
}
```

---

## 13.3 Level Builder Agent

### Input

```ts
export interface LevelBuilderInput {
  area: Area;
  world: World;
  questContext?: QuestDefinition[];
}
```

### Output

```ts
export interface LevelBuilderOutput {
  area: Area;
  interactionPoints: InteractionPoint[];
}
```

---

## 13.4 NPC Brain Agent

### Input

```ts
export interface NpcBrainInput {
  npcDefinition: NpcDefinition;
  npcState: NpcState;
  activeQuests: QuestProgress[];
  playerState: PlayerState;
  recentDialogue: NpcDialogueTurn[];
}
```

### Output

```ts
export interface NpcBrainOutput {
  npcReply: string;
  updatedDisposition?: NpcDisposition;
  trustDelta?: number;
  relationshipDelta?: number;
  unlockedQuestIds?: QuestId[];
  explanationHint?: string;
}
```

---

## 13.5 Enemy Tactician Agent

### Input

```ts
export interface EnemyTacticianInput {
  encounter: CombatEncounterDefinition;
  combatState: CombatState;
  playerTags: PlayerProfileTag[];
}
```

### Output

```ts
export interface EnemyTacticianOutput {
  selectedTactic: EnemyTacticType;
  reason?: string;
}
```

---

## 13.6 Game Master Agent

### Input

```ts
export interface GameMasterInput {
  currentAreaId: AreaId;
  activeQuestIds: QuestId[];
  triggeredEvents: EventLogEntry[];
  playerTags: PlayerProfileTag[];
}
```

### Output

```ts
export interface GameMasterOutput {
  eventToTrigger?: EventId;
  pacingNote?: string;
}
```

---

## 13.7 Player Model Agent

### Input

```ts
export interface PlayerModelInput {
  recentAreaVisits: AreaId[];
  recentQuestChoices: string[];
  combatSummary?: CombatState | null;
  npcInteractionCount: number;
}
```

### Output

```ts
export interface PlayerModelOutput {
  tags: PlayerProfileTag[];
  rationale?: string[];
}
```

---

## 13.8 Explain & Coach Agent

### Input

```ts
export interface ExplainCoachInput {
  player: PlayerState;
  combat?: CombatState | null;
  questProgress: QuestProgress[];
  eventHistory: EventLogEntry[];
}
```

### Output

```ts
export interface ExplainCoachOutput {
  review: ReviewPayload;
}
```

---

# 14. Controller Service Contracts

These are not UI contracts. They define application-level actions.

## 14.1 Startup Controller

```ts
export interface StartupController {
  initialize(): Promise<LoadResult>;
}
```

## 14.2 Save Controller

```ts
export interface SaveController {
  saveNow(source: "auto" | "manual" | "debug"): Promise<void>;
  loadLatest(): Promise<LoadResult>;
  resetToDefault(): Promise<void>;
}
```

## 14.3 Dialogue Controller

```ts
export interface DialogueController {
  startDialogue(npcId: NpcId): Promise<void>;
  chooseDialogueOption(npcId: NpcId, optionId: string): Promise<void>;
  endDialogue(npcId: NpcId): Promise<void>;
}
```

## 14.4 Combat Controller

```ts
export interface CombatController {
  startEncounter(encounterId: EncounterId): Promise<void>;
  submitPlayerAction(actionType: string): Promise<void>;
  endEncounter(): Promise<void>;
}
```

---

# 15. Persistence Service Contracts

## 15.1 Storage Adapter

```ts
export interface StorageAdapter {
  getLatestSave(): Promise<SaveSnapshot | null>;
  getSaveById(id: SaveId): Promise<SaveSnapshot | null>;
  writeSave(snapshot: SaveSnapshot): Promise<void>;
  deleteSave(id: SaveId): Promise<void>;
  listSaves(): Promise<SaveMetadata[]>;
}
```

## 15.2 Save Validator

```ts
export interface SaveValidator {
  validate(snapshot: unknown): LoadResult;
}
```

## 15.3 Save Migrator

```ts
export interface SaveMigrator {
  migrate(snapshot: unknown): LoadResult;
}
```

## 15.4 Session Snapshot

```ts
export interface SessionSnapshot {
  ui: {
    activePanel: "map" | "npc" | "quest" | "combat" | "review" | "debug";
    selectedNpcId: NpcId | null;
    selectedQuestId: QuestId | null;
    selectedAreaId: AreaId | null;
    selectedEventId: EventId | null;
    isDebugOverlayOpen: boolean;
  };
  debug: {
    debugModeEnabled: boolean;
    activeScenarioId?: string;
    forcedAreaId: AreaId | null;
    forcedQuestId: QuestId | null;
    forcedNpcId: NpcId | null;
    forcedEncounterId: EncounterId | null;
    forcedEventId: EventId | null;
    forcedTactic: EnemyTacticType | null;
    injectedPlayerTags: PlayerProfileTag[];
    logsPanelOpen: boolean;
  };
  session: {
    lastVisitedRouteId: "home" | "game" | "debug" | "review";
    routeHistory: Array<"home" | "game" | "debug" | "review">;
    startedAt?: IsoTimestamp;
    lastActiveAt?: IsoTimestamp;
    hasHydratedSession: boolean;
  };
}
```

---

# 16. Event Bus Contracts

## 16.1 Domain Event Name

```ts
export type DomainEventName =
  | "WORLD_LOADED"
  | "AREA_ENTERED"
  | "NPC_INTERACTED"
  | "QUEST_UPDATED"
  | "EVENT_TRIGGERED"
  | "COMBAT_STARTED"
  | "TACTIC_CHANGED"
  | "COMBAT_ENDED"
  | "SAVE_CREATED"
  | "SAVE_RESTORED"
  | "PLAYER_MODEL_UPDATED";
```

## 16.2 Domain Event

```ts
export interface DomainEvent<TPayload = unknown> {
  name: DomainEventName;
  payload: TPayload;
  createdAt: IsoTimestamp;
}
```

---

# 17. Suggested Zod Schema Mapping

Recommended implementation files:

```text
src/core/schemas/
  world.schema.ts
  area.schema.ts
  quest.schema.ts
  npc.schema.ts
  player.schema.ts
  config.schema.ts
  creation.schema.ts
  event.schema.ts
  combat.schema.ts
  review.schema.ts
  save.schema.ts
  session.schema.ts
  agent.schema.ts
```

Every schema file should export:

* zod schema
* inferred TypeScript type
* parser or validator helper when useful

---

# 18. Contract Stability Rules

When changing a contract:

1. update this file
2. update matching schema definitions
3. update fixtures/mocks
4. update affected tests
5. if save contract changes, update version and migration logic

---

# 19. MVP Minimum Required Contracts

The MVP cannot proceed without stable definitions for:

* World
* Area
* QuestDefinition / QuestProgress
* NpcDefinition / NpcState
* PlayerState
* CombatState
* SaveSnapshot
* NpcBrainInput / Output
* EnemyTacticianInput / Output
* ReviewPayload

These should be implemented first in code.

---

# 20. Next Implementation Step

After this document is accepted, the next engineering action should be:

1. convert these contracts into runtime schemas
2. create mock fixtures that validate against them
3. build initial stores around these types
4. wire startup load/fallback flow using `SaveSnapshot`
