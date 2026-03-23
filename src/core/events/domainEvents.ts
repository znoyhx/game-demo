import type {
  Area,
  CombatResult,
  EnemyTacticType,
  EventLogSource,
  LoadFailureReason,
  NpcDisposition,
  PlayerProfileTag,
  QuestStatus,
  SaveSource,
} from '../schemas';

import { EventBus } from './eventBus';

export const gameDomainEventNames = [
  'WORLD_LOADED',
  'AREA_ENTERED',
  'NPC_INTERACTED',
  'QUEST_UPDATED',
  'EVENT_TRIGGERED',
  'COMBAT_STARTED',
  'TACTIC_CHANGED',
  'COMBAT_ENDED',
  'SAVE_CREATED',
  'SAVE_RESTORED',
  'PLAYER_MODEL_UPDATED',
  'REVIEW_GENERATED',
] as const;

export type GameDomainEventName = (typeof gameDomainEventNames)[number];

export interface GameDomainEventMap {
  WORLD_LOADED: {
    worldId: string;
    source: 'save' | 'mock';
    reason: 'save-restored' | 'no-save' | 'invalid-save' | 'storage-error';
    saveId: string;
    loadFailureReason?: LoadFailureReason;
  };
  AREA_ENTERED: {
    areaId: string;
    previousAreaId?: string;
    unlockedAreaIds: string[];
  };
  NPC_INTERACTED: {
    npcId: string;
    trustDelta: number;
    relationshipDelta: number;
    disposition: NpcDisposition;
    unlockedQuestIds: string[];
  };
  QUEST_UPDATED: {
    questId: string;
    status: QuestStatus;
    currentObjectiveIndex: number;
  };
  EVENT_TRIGGERED: {
    eventId: string;
    source: EventLogSource;
    unlockedAreaIds: string[];
    startedQuestIds: string[];
  };
  COMBAT_STARTED: {
    encounterId: string;
    areaId: Area['id'];
    initialTactic: EnemyTacticType;
  };
  TACTIC_CHANGED: {
    encounterId: string;
    previousTactic: EnemyTacticType;
    nextTactic: EnemyTacticType;
    phaseId?: string;
  };
  COMBAT_ENDED: {
    encounterId: string;
    result: CombatResult;
    finalTactic: EnemyTacticType;
  };
  SAVE_CREATED: {
    saveId: string;
    source: SaveSource;
    updatedAt: string;
  };
  SAVE_RESTORED: {
    saveId: string;
    updatedAt: string;
  };
  PLAYER_MODEL_UPDATED: {
    tags: PlayerProfileTag[];
    dominantStyle?: PlayerProfileTag;
  };
  REVIEW_GENERATED: {
    encounterId?: string;
    explanationCount: number;
    suggestionCount: number;
  };
}

export type GameEventBus = EventBus<GameDomainEventMap>;
export type GameDomainEvent<TKey extends GameDomainEventName> = {
  name: TKey;
  payload: GameDomainEventMap[TKey];
  createdAt: string;
};
export type AnyGameDomainEvent = {
  [TKey in GameDomainEventName]: GameDomainEvent<TKey>;
}[GameDomainEventName];

export const createGameEventBus = (
  now?: () => string,
): GameEventBus => new EventBus<GameDomainEventMap>(now);
