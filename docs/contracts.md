---

## `docs/contracts.md`

```md
# PixelForge Agent Contracts
Version: v0.3
Status: Active contract draft

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
export type InteractionTravelMode = "walk" | "teleport";

export interface InteractionPoint {
  id: string;
  label: string;
  type: "npc" | "item" | "portal" | "event" | "shop" | "battle";
  x: number;
  y: number;
  targetId?: string;
  resourceNodeId?: string;
  enabled?: boolean;
  travelMode?: InteractionTravelMode;
}
```

## 5.3 Area Enter Condition

```ts
export interface AreaEnterCondition {
  requiredQuestIds?: QuestId[];
  requiredWorldFlags?: string[];
  requiredNpcTrust?: Array<{
    npcId: NpcId;
    minTrust: number;
  }>;
}

export type AreaUnlockCondition = AreaEnterCondition;
```

## 5.4 Enemy Spawn Rule

```ts
export type EnemySpawnTrigger =
  | "always"
  | "on-enter"
  | "on-search"
  | "on-event"
  | "on-alert";

export interface EnemySpawnRule {
  id: string;
  label: string;
  trigger: EnemySpawnTrigger;
  encounterId?: EncounterId;
  enemyNpcId?: NpcId;
  enemyArchetype?: string;
  spawnWeight: number;
  maxActive: number;
  requiredWorldFlags?: string[];
  blockedWorldFlags?: string[];
}
```

## 5.5 Resource Node

```ts
export type ResourceNodeKind =
  | "supply"
  | "ore"
  | "herb"
  | "relic"
  | "ember"
  | "cache";

export interface ResourceNode {
  id: string;
  label: string;
  kind: ResourceNodeKind;
  itemId?: ItemId;
  quantity: number;
  renewable: boolean;
  discoveredByDefault: boolean;
  requiredWorldFlags?: string[];
}
```

## 5.6 Area Environment

```ts
export type AreaEnvironmentHazard = "stable" | "tense" | "volatile";

export interface AreaEnvironmentActivation {
  requiredWorldFlags?: string[];
  blockedWorldFlags?: string[];
}

export interface AreaEnvironmentState {
  id: string;
  label: string;
  weather?: string;
  lighting?: string;
  hazard: AreaEnvironmentHazard;
  note?: string;
  activation?: AreaEnvironmentActivation;
}

export interface AreaEnvironment {
  activeStateId?: string;
  states: AreaEnvironmentState[];
}
```

## 5.7 Area Scene Definition

```ts
export interface AreaSceneTile {
  id: string;
  x: number;
  y: number;
  kind:
    | "grass"
    | "path"
    | "stone"
    | "wood"
    | "water"
    | "foliage"
    | "wall"
    | "ember"
    | "void"
    | "bridge";
  layer: "ground" | "overlay";
  blocked: boolean;
}

export interface AreaSceneDefinition {
  grid: {
    width: number;
    height: number;
  };
  playerSpawn: {
    x: number;
    y: number;
  };
  tiles: AreaSceneTile[];
  decorativeLayers: Array<{
    id: string;
    label: string;
    layer: "ground" | "overlay";
    tiles: AreaSceneTile[];
  }>;
  npcSpawns: Array<{
    npcId: NpcId;
    x: number;
    y: number;
  }>;
  interactionSpawns: Array<{
    interactionId: string;
    x: number;
    y: number;
  }>;
  portalSpawns: Array<{
    interactionId: string;
    targetAreaId: AreaId;
    travelMode: "walk" | "teleport";
    x: number;
    y: number;
  }>;
}
```

This contract is gameplay-scene data, not a renderer implementation detail:

* it belongs to core state and save payloads
* it keeps tile collisions, NPC placements, and portal placements explicit
* UI renderers may adapt it into Phaser/Pixi presentation contracts without owning the source map layout

## 5.8 Area Contract

```ts
export interface Area {
  id: AreaId;
  name: string;
  type: AreaType;
  description: string;
  difficulty: number;
  unlockedByDefault: boolean;
  isHiddenUntilDiscovered?: boolean;
  enterCondition?: AreaEnterCondition;
  unlockCondition?: AreaUnlockCondition;
  npcIds: NpcId[];
  interactionPoints: InteractionPoint[];
  enemySpawnRules: EnemySpawnRule[];
  eventIds: EventId[];
  resourceNodes: ResourceNode[];
  environment: AreaEnvironment;
  connectedAreaIds: AreaId[];
  backgroundKey?: string;
  musicKey?: string;
  scene: AreaSceneDefinition;
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

## 6.5.1 Quest Condition

```ts
export type QuestConditionType =
  | "talk"
  | "visit"
  | "collect"
  | "battle"
  | "trigger"
  | "quest-status"
  | "world-flag"
  | "npc-trust"
  | "player-tag"
  | "event"
  | "current-area"
  | "visited-area";

export interface QuestCondition {
  id: string;
  label: string;
  type: QuestConditionType;
  targetId?: string;
  requiredStatus?: QuestStatus;
  requiredCount?: number;
  minTrust?: number;
  playerTag?: PlayerProfileTag;
}
```

## 6.5.2 Quest Dependency

```ts
export interface QuestDependency {
  questId: QuestId;
  requiredStatus: QuestStatus;
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
  triggerConditions: QuestCondition[];
  completionConditions: QuestCondition[];
  failureConditions: QuestCondition[];
  dependencies: QuestDependency[];
  objectives?: QuestObjective[]; // legacy-compatible ordered steps
  reward?: QuestReward;
  failureCondition?: string; // legacy-compatible descriptive failure text
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

Quest legality should always be evaluated against:

- trigger conditions
- dependencies
- ordered completion conditions
- failure conditions
- optional branch result conditions

Quest logs should be persisted separately from definitions and progress state.

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
  identity: string;
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
  emotionalState:
    | "calm"
    | "hopeful"
    | "wary"
    | "tense"
    | "angry"
    | "grateful"
    | "resolute"
    | "fearful";
  memory: NpcMemorySummary;
  revealableInfo: NpcRevealableInfo;
  revealedFacts: string[];
  revealedSecrets: string[];
  relationshipNetwork: Array<{
    targetNpcId: NpcId;
    bond: string;
    strength: number;
  }>;
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

## 7.8 NPC Interaction Explanation

```ts
export interface NpcInteractionExplanation {
  npcId: NpcId;
  npcName: string;
  attitudeLabel: string;
  emotionalStateLabel: string;
  trust: {
    before: number;
    after: number;
    delta: number;
    reasons: string[];
  };
  relationship: {
    before: number;
    after: number;
    delta: number;
    reasons: string[];
  };
  decisionBasis: string[];
  disclosedInfo: string[];
  debugSummary: string;
}
```

## 7.9 NPC Debug State Injection

```ts
export interface NpcDebugStateInjection {
  npcId: NpcId;
  trust?: number;
  relationship?: number;
  currentDisposition?: NpcDisposition;
  emotionalState?: NpcEmotionalState;
  shortTermMemory?: string[];
  longTermMemory?: string[];
  lastInteractionAt?: IsoTimestamp | null;
  currentGoal?: string;
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
  recentCombatActions: CombatCommandAction[];
  recentNpcInteractionIntents: Array<
    "greet" | "ask" | "trade" | "quest" | "persuade" | "leave"
  >;
  recentQuestChoices: string[];
  npcInteractionCount: number;
  signalWeights: Record<PlayerProfileTag, number>;
  dominantStyle?: PlayerProfileTag;
  riskForecast?: string;
  stuckPoint?: string;
  debugProfile?: {
    injected: true;
    source: "manual-tags" | "behavior-replay" | "preset-scenario";
    label: string;
  };
  lastUpdatedAt?: IsoTimestamp;
}
```

```ts
export interface PlayerModelDebugScenario {
  id: string;
  label: string;
  description: string;
  replaySteps: PlayerModelBehaviorReplayStep[];
  expectedTags: PlayerProfileTag[];
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
  requiredQuestStatus?: QuestStatus;
  requiredNpcId?: NpcId;
  requiredNpcTrustAtLeast?: number;
  requiredNpcRelationshipAtLeast?: number;
  requiredPlayerTag?: PlayerProfileTag;
  requiredWorldFlag?: string;
  requiredTimeOfDay?: string;
  minimumWorldTension?: number;
  maximumWorldTension?: number;
}
```

## 9.3 Event Effect

```ts
export interface EventEffect {
  setWorldFlags?: string[];
  setWeather?: string;
  setTimeOfDay?: string;
  unlockAreaIds?: AreaId[];
  lockAreaIds?: AreaId[];
  startQuestIds?: QuestId[];
  updateNpcTrust?: Array<{
    npcId: NpcId;
    delta: number;
  }>;
  reduceResources?: Array<{
    areaId: AreaId;
    resourceNodeId?: string;
    amount: number;
    minimumRemaining?: number;
  }>;
  moveNpcs?: Array<{
    npcId: NpcId;
    toAreaId: AreaId;
    x?: number;
    y?: number;
  }>;
  setFactionStances?: Array<{
    factionId: FactionId;
    stance: "friendly" | "neutral" | "hostile" | "hidden";
  }>;
  registerFactionConflicts?: Array<{
    conflictId: string;
    label: string;
    sourceFactionId: FactionId;
    targetFactionId: FactionId;
    intensity: number;
  }>;
  revealClues?: Array<{
    clueId: string;
    label: string;
    description: string;
    areaId?: AreaId;
  }>;
  setShopPriceModifiers?: Array<{
    npcId: NpcId;
    multiplier: number;
    reason?: string;
  }>;
  bossAppearances?: Array<{
    npcId: NpcId;
    areaId: AreaId;
    note?: string;
  }>;
}
```

## 9.4 World Event

```ts
export type WorldEventType =
  | "weather-change"
  | "resource-reduction"
  | "npc-movement"
  | "faction-conflict"
  | "hidden-clue-exposure"
  | "early-boss-appearance"
  | "shop-price-change"
  | "area-state-change";

export interface WorldEvent {
  id: EventId;
  type: WorldEventType;
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

## 9.6 Event Director State

```ts
export interface EventDirectorState {
  pendingEventIds: EventId[];
  scheduledEvents: Array<{
    eventId: EventId;
    scheduledBy: "game-master" | "system";
    reason?: string;
  }>;
  worldTension: number;
  pacingNote?: string;
  randomnessDisabled: boolean;
  revealedClues: Array<{
    clueId: string;
    label: string;
    description: string;
    areaId?: AreaId;
    sourceEventId: EventId;
    revealedAt: IsoTimestamp;
  }>;
  shopPriceModifiers: Array<{
    npcId: NpcId;
    multiplier: number;
    reason?: string;
    sourceEventId: EventId;
    changedAt: IsoTimestamp;
  }>;
  factionConflicts: Array<{
    conflictId: string;
    label: string;
    sourceFactionId: FactionId;
    targetFactionId: FactionId;
    intensity: number;
    sourceEventId: EventId;
    startedAt: IsoTimestamp;
  }>;
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

## 10.2.1 Combat Debug Player Pattern

```ts
export type CombatDebugPlayerPattern =
  | "direct-pressure"
  | "guard-cycle"
  | "resource-burst"
  | "analysis-first";
```

## 10.2.2 Combat Command Action

```ts
export type CombatCommandAction =
  | "attack"
  | "guard"
  | "heal"
  | "analyze"
  | "special"
  | "retreat";
```

## 10.2.3 Combat Environment State

```ts
export interface CombatEnvironmentState {
  areaId: AreaId;
  label: string;
  hazard: "stable" | "tense" | "volatile";
  weather?: string;
  lighting?: string;
}
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

## 10.9 Exploration Runtime State

```ts
export interface ExplorationEncounterSignal {
  id: string;
  areaId: AreaId;
  ruleId: string;
  label: string;
  encounterId: EncounterId;
  trigger: EnemySpawnTrigger;
  status: "pending" | "engaged" | "resolved";
  createdAt: IsoTimestamp;
  x: number;
  y: number;
  sourceInteractionId?: string;
  enemyArchetype?: string;
}

export interface ExplorationRuleState {
  areaId: AreaId;
  ruleId: string;
  triggerCount: number;
  lastTriggeredAt?: IsoTimestamp;
}

export interface ExplorationState {
  signals: ExplorationEncounterSignal[];
  ruleStates: ExplorationRuleState[];
  searchedInteractionIds: string[];
  collectedResourceNodeIds: string[];
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
export type ReviewTriggerType =
  | "combat"
  | "quest-branch"
  | "npc-interaction"
  | "run-complete"
  | "run-failed"
  | "manual";

export interface ReviewPayload {
  generatedAt: IsoTimestamp;
  trigger: ReviewTriggerType;
  encounterId?: EncounterId;
  playerTags: PlayerProfileTag[];
  playerModelSnapshot: {
    tags: PlayerProfileTag[];
    dominantStyle?: PlayerProfileTag;
    rationale: string[];
    riskForecast?: string;
    stuckPoint?: string;
    debugProfile?: {
      injected: boolean;
      source: "manual-tags" | "behavior-replay" | "preset-scenario";
      label: string;
    };
  };
  combatSummary: {
    result: {
      result: "victory" | "defeat" | "escape";
      totalTurns: number;
      finalTactic: EnemyTacticType;
      finalPhaseId?: string;
      playerRemainingHp: number;
      enemyRemainingHp: number;
      summary: string;
    };
    tacticChanges: Array<{
      turn: number;
      fromTactic?: EnemyTacticType;
      toTactic: EnemyTacticType;
      phaseId?: string;
      summary: string;
    }>;
    phaseChanges: Array<{
      turn: number;
      fromPhaseId?: string;
      toPhaseId: string;
      summary: string;
    }>;
    keyPlayerBehaviors: Array<{
      actionType: "attack" | "guard" | "heal" | "analyze" | "special" | "retreat";
      count: number;
      summary: string;
    }>;
  } | null;
  questBranchReasons: Array<{
    questId: QuestId;
    questTitle: string;
    branchId?: string;
    branchLabel?: string;
    status: QuestStatus;
    summary: string;
    reasons: string[];
  }>;
  npcAttitudeReasons: Array<{
    npcId: NpcId;
    npcName: string;
    attitudeLabel: string;
    emotionalStateLabel: string;
    trustDelta: number;
    relationshipDelta: number;
    summary: string;
    reasons: string[];
    decisionBasis: string[];
  }>;
  enemyTacticReasons: Array<{
    turn: number;
    fromTactic?: EnemyTacticType;
    toTactic: EnemyTacticType;
    phaseId?: string;
    summary: string;
    reasons: string[];
  }>;
  outcomeFactors: Array<{
    kind: "success" | "failure" | "risk" | "opportunity";
    title: string;
    summary: string;
    evidence: string[];
  }>;
  keyEvents: string[];
  nextStepSuggestions: string[];
  knowledgeSummary: {
    extensionKey: "education-mode";
    title: string;
    summary: string;
    keyPoints: string[];
    suggestedPrompt?: string;
  } | null;
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
    director?: EventDirectorState;
  };
  combatSystem?: {
    encounters: CombatEncounterDefinition[];
    active: CombatState | null;
    history: Array<{
      encounterId: EncounterId;
      result: "victory" | "defeat" | "escape";
      finalTactic: EnemyTacticType;
      resolvedAt: IsoTimestamp;
      turnCount: number;
      finalPhaseId?: string;
      playerRemainingHp?: number;
      enemyRemainingHp?: number;
      tacticChanges: Array<{
        turn: number;
        fromTactic?: EnemyTacticType;
        toTactic: EnemyTacticType;
        phaseId?: string;
        summary: string;
      }>;
      phaseChanges: Array<{
        turn: number;
        fromPhaseId?: string;
        toPhaseId: string;
        summary: string;
      }>;
      keyPlayerBehaviors: Array<{
        actionType: "attack" | "guard" | "heal" | "analyze" | "special" | "retreat";
        count: number;
        summary: string;
      }>;
    }>;
  };
  combat?: CombatState | null;
  exploration?: ExplorationState;
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
  questDefinitions: QuestDefinition[];
  questProgressEntries: QuestProgress[];
  playerState: PlayerState;
  playerModel: PlayerModelState;
  selectedIntent?: "greet" | "ask" | "trade" | "quest" | "persuade" | "leave";
  recentDialogue: NpcDialogueTurn[];
}
```

### Output

```ts
export interface NpcBrainOutput {
  npcReply: string;
  trustDelta?: number;
  relationshipDelta?: number;
  memoryNote?: string;
  longTermMemoryNote?: string;
  questOfferIds: QuestId[];
  itemTransfers: Array<{
    itemId: ItemId;
    quantity: number;
    direction: "to-player" | "from-player";
  }>;
  playerGoldDelta: number;
  relationshipNetworkChanges: Array<{
    targetNpcId: NpcId;
    delta: number;
    bond?: string;
  }>;
  decisionBasis: string[];
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
  playerState: PlayerState;
  playerTags: PlayerProfileTag[];
  commonPlayerActions: CombatCommandAction[];
  environmentState?: CombatEnvironmentState;
  bossPhaseId?: string;
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
  worldFlags: Record<string, boolean>;
  worldTension: number;
  timeOfDay?: string;
  availableEvents: WorldEvent[];
  pendingEvents: EventDirectorState["scheduledEvents"];
}
```

### Output

```ts
export interface GameMasterOutput {
  eventToTrigger?: EventId;
  scheduledEvents: EventDirectorState["scheduledEvents"];
  pacingNote?: string;
  worldTensionDelta?: number;
}
```

---

## 13.7 Player Model Agent

### Input

```ts
export interface PlayerModelInput {
  recentAreaVisits: AreaId[];
  recentCombatActions: CombatCommandAction[];
  recentNpcInteractionIntents: Array<
    "greet" | "ask" | "trade" | "quest" | "persuade" | "leave"
  >;
  recentQuestChoices: string[];
  combatSummary?: CombatState | null;
  combatHistory: CombatHistoryEntry[];
  npcInteractionCount: number;
  activeQuestCount: number;
  completedQuestCount: number;
  signalWeights: Record<PlayerProfileTag, number>;
}
```

### Output

```ts
export interface PlayerModelOutput {
  tags: PlayerProfileTag[];
  rationale?: string[];
  riskForecast?: string;
  stuckPoint?: string;
}
```

---

## 13.8 Explain & Coach Agent

### Input

```ts
export interface ReviewRequest {
  trigger: ReviewTriggerType;
  questBranch?: {
    questId: QuestId;
    questTitle: string;
    branchId?: string;
    branchLabel?: string;
    status: QuestStatus;
    summary: string;
    reasons: string[];
  };
  npcInteraction?: {
    npcId: NpcId;
    npcName: string;
    explanation: NpcInteractionExplanation;
    unlockedQuestIds: QuestId[];
    isMajor: boolean;
  };
  runOutcome?: {
    result: "completed" | "failed";
    questId?: QuestId;
    questTitle?: string;
    summary: string;
    reasons: string[];
  };
}

export interface ReviewReconstructionTarget {
  trigger?: ReviewTriggerType;
  encounterId?: EncounterId;
  combatHistoryIndex?: number;
  questId?: QuestId;
  questHistoryIndex?: number;
  npcId?: NpcId;
  eventId?: EventId;
  eventHistoryIndex?: number;
}

export interface ExplainCoachInput {
  player: PlayerState;
  playerModel: PlayerModelState;
  difficulty: "easy" | "normal" | "hard";
  reviewRequest: ReviewRequest;
  reviewHistory: ReviewPayload[];
  encounter?: CombatEncounterDefinition | null;
  combat?: CombatState | null;
  combatHistory: CombatHistoryEntry[];
  questProgress: QuestProgress[];
  eventHistory: EventLogEntry[];
}
```

`ExplainCoachInput` is reused for both live review generation and deterministic reconstruction from saved snapshots, so standalone debug and test replay flows stay on the same validated agent boundary.

### Output

```ts
export interface ExplainCoachOutput {
  review: ReviewPayload;
}
```

---

# 14. Presentation Contracts

These contracts sit between page/view-model builders and renderer-facing UI components.

## 14.1 Area Scene Stage Model

The main scene viewport may consume a validated presentation payload that includes:

* renderer label and engine targets
* layered placeholder tiles for background / terrain / structures / highlights
* interaction markers with feedback tone and state
* legend badges for interaction affordances

This contract is presentation-only:

* it must not embed quest, combat, or NPC rules
* it should be derivable from validated state and selectors
* it should stay compatible with both DOM placeholders and future Phaser/Pixi scene renderers

## 14.2 Pixel Scene Render Model

The Phaser gameplay canvas now consumes a second presentation-only contract that is still derived from validated domain state rather than from ad hoc component logic.

It should include:

* renderer id
* area id / display labels
* tile viewport metadata
* deterministic tile grid entries
* player spawn position
* in-scene entities for NPCs, shops, portals, events, battles, and items
* prompt copy and summary metrics

It should now be derived from explicit `Area.scene` tile data plus localized marker metadata, rather than procedurally inventing a map from area type alone.

It must not include:

* direct controller references
* rule evaluation functions
* save writers
* raw mutable store access

This contract exists specifically so the real-time renderer can stay modular, testable, and replaceable while continuing to respect the same UI-layer boundary as the rest of the application.

---

# 15. Controller Service Contracts

These are not UI contracts. They define application-level actions.

## 15.1 Startup Controller

```ts
export interface StartupController {
  initialize(): Promise<LoadResult>;
}
```

## 15.2 Save Controller

```ts
export interface SaveController {
  saveNow(source: "auto" | "manual" | "debug"): Promise<void>;
  loadLatest(): Promise<LoadResult>;
  resetToDefault(): Promise<void>;
}
```

## 15.3 Dialogue Controller

```ts
export interface DialogueController {
  startDialogue(npcId: NpcId): Promise<void>;
  chooseDialogueOption(npcId: NpcId, optionId: string): Promise<void>;
  endDialogue(npcId: NpcId): Promise<void>;
}
```

## 15.4 Combat Controller

```ts
export interface CombatController {
  startEncounter(encounterId: EncounterId): Promise<void>;
  submitPlayerAction(actionType: string): Promise<void>;
  endEncounter(): Promise<void>;
}
```

## 15.4.1 Exploration Encounter Controller

```ts
export interface ExplorationEncounterController {
  handleAreaEnter(
    areaId: AreaId,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<unknown>;
  searchInteraction(
    interactionId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<unknown>;
  activateSignal(
    signalId: string,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<unknown>;
}
```

## 15.5 Area Navigation Controller

```ts
export interface AreaNavigationController {
  enterArea(
    areaId: AreaId,
    options?: {
      ignoreConnectivity?: boolean;
      autoSave?: boolean;
    },
  ): Promise<RuleResult | null>;
}
```

## 15.6 Event Trigger Controller

```ts
export interface EventTriggerController {
  triggerEvent(
    eventId: EventId,
    source?: EventLogSource,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<unknown>;

  triggerAreaEntryEvents(
    areaId: AreaId,
    options?: {
      autoSave?: boolean;
    },
  ): Promise<unknown[]>;
}
```

---

# 16. Persistence Service Contracts

## 16.1 Storage Adapter

```ts
export interface StorageAdapter {
  getLatestSave(): Promise<SaveSnapshot | null>;
  getSaveById(id: SaveId): Promise<SaveSnapshot | null>;
  writeSave(snapshot: SaveSnapshot): Promise<void>;
  deleteSave(id: SaveId): Promise<void>;
  listSaves(): Promise<SaveMetadata[]>;
}
```

## 16.2 Save Validator

```ts
export interface SaveValidator {
  validate(snapshot: unknown): LoadResult;
}
```

## 16.3 Save Migrator

```ts
export interface SaveMigrator {
  migrate(snapshot: unknown): LoadResult;
}
```

## 16.4 Session Snapshot

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
    forcedPhaseId: string | null;
    simulatedPlayerPattern: CombatDebugPlayerPattern | null;
    combatSeed: number | null;
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

# 17. Event Bus Contracts

## 17.1 Domain Event Name

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

## 17.2 Domain Event

```ts
export interface DomainEvent<TPayload = unknown> {
  name: DomainEventName;
  payload: TPayload;
  createdAt: IsoTimestamp;
}
```

---

# 18. Suggested Zod Schema Mapping

Recommended implementation files:

```text
src/core/schemas/
  world.schema.ts
  area.schema.ts
  quest.schema.ts
  eventDebug.schema.ts
  npc.schema.ts
  player.schema.ts
  config.schema.ts
  creation.schema.ts
  event.schema.ts
  combat.schema.ts
  exploration.schema.ts
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

# 19. Contract Stability Rules

When changing a contract:

1. update this file
2. update matching schema definitions
3. update fixtures/mocks
4. update affected tests
5. if save contract changes, update version and migration logic

---

# 20. MVP Minimum Required Contracts

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

# 21. Next Implementation Step

After this document is accepted, the next engineering action should be:

1. convert these contracts into runtime schemas
2. create mock fixtures that validate against them
3. build initial stores around these types
4. wire startup load/fallback flow using `SaveSnapshot`
