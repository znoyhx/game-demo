import type { AgentModuleId } from '../agents';
import type { AnyGameDomainEvent, GameDomainEventName } from '../events/domainEvents';
import type {
  CombatResult,
  EnemyTacticType,
  NpcInteractionExplanation,
  NpcDialogueTurn,
  PlayerProfileTag,
} from '../schemas';

export type GameLogKind =
  | 'domain-event'
  | 'npc-interaction'
  | 'combat'
  | 'save-load'
  | 'agent-decision'
  | 'explanation-input';

export interface BaseLogRecord {
  id: string;
  kind: GameLogKind;
  createdAt: string;
  summary: string;
}

export interface DomainEventLogRecord extends BaseLogRecord {
  kind: 'domain-event';
  eventName: GameDomainEventName;
  event: AnyGameDomainEvent;
}

export interface NpcInteractionLogRecord extends BaseLogRecord {
  kind: 'npc-interaction';
  npcId: string;
  trustDelta: number;
  relationshipDelta: number;
  unlockedQuestIds: string[];
  dialogue?: NpcDialogueTurn[];
  reply?: string;
  explanation?: NpcInteractionExplanation;
}

export interface CombatLogRecord extends BaseLogRecord {
  kind: 'combat';
  encounterId: string;
  tactic?: EnemyTacticType;
  result?: CombatResult;
  phaseId?: string;
  turn?: number;
  actionType?: string;
}

export interface SaveLoadLogRecord extends BaseLogRecord {
  kind: 'save-load';
  operation: 'world-loaded' | 'save-created' | 'save-restored';
  saveId: string;
  reason?: string;
  source?: string;
}

export interface AgentDecisionLogRecord extends BaseLogRecord {
  kind: 'agent-decision';
  agentId: AgentModuleId;
  inputSummary: string;
  outputSummary: string;
  input: unknown;
  output: unknown;
}

export interface ExplanationInputLogRecord extends BaseLogRecord {
  kind: 'explanation-input';
  encounterId?: string;
  questIds: string[];
  eventIds: string[];
  playerTags: PlayerProfileTag[];
  input: unknown;
}

export type GameLogRecord =
  | DomainEventLogRecord
  | NpcInteractionLogRecord
  | CombatLogRecord
  | SaveLoadLogRecord
  | AgentDecisionLogRecord
  | ExplanationInputLogRecord;
