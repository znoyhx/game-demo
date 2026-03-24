import type { StoreApi } from 'zustand/vanilla';

import type { AgentModuleId } from '../agents';
import type { AnyGameDomainEvent, GameEventBus } from '../events/domainEvents';
import type {
  EnemyTacticType,
  NpcInteractionExplanation,
  NpcDialogueTurn,
  PlayerProfileTag,
} from '../schemas';
import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  saveSourceLabels,
} from '../utils/displayLabels';
import { locale } from '../utils/locale';
import type { GameLogRecord } from './logTypes';
import type { GameLogState } from './logStore';

const agentLabels: Record<AgentModuleId, string> = locale.labels.agentLabels;

const domainEventLabels: Record<AnyGameDomainEvent['name'], string> =
  locale.labels.domainEvents;

const combatActionLabels: Record<string, string> = locale.labels.combatActions;

export class GameLogger {
  private sequence = 0;

  constructor(private readonly store: StoreApi<GameLogState>) {}

  private nextId(prefix: string, createdAt: string) {
    this.sequence += 1;
    return `${prefix}:${createdAt}:${this.sequence}`;
  }

  private append(entry: GameLogRecord) {
    this.store.getState().appendLog(entry);
  }

  recordDomainEvent(event: AnyGameDomainEvent) {
    this.append({
      id: this.nextId('log:domain', event.createdAt),
      kind: 'domain-event',
      createdAt: event.createdAt,
      summary: locale.logging.domainEventSummary(domainEventLabels[event.name]),
      eventName: event.name,
      event,
    });

    switch (event.name) {
      case 'NPC_INTERACTED':
        this.append({
          id: this.nextId('log:npc', event.createdAt),
          kind: 'npc-interaction',
          createdAt: event.createdAt,
          summary: locale.logging.npcInteractionSummary,
          npcId: event.payload.npcId,
          trustDelta: event.payload.trustDelta,
          relationshipDelta: event.payload.relationshipDelta,
          unlockedQuestIds: event.payload.unlockedQuestIds,
        });
        break;
      case 'COMBAT_STARTED':
        this.append({
          id: this.nextId('log:combat', event.createdAt),
          kind: 'combat',
          createdAt: event.createdAt,
          summary: locale.logging.combatStartedSummary,
          encounterId: event.payload.encounterId,
          tactic: event.payload.initialTactic,
        });
        break;
      case 'TACTIC_CHANGED':
        this.append({
          id: this.nextId('log:combat', event.createdAt),
          kind: 'combat',
          createdAt: event.createdAt,
          summary: locale.logging.tacticChangedSummary(
            formatEnemyTacticLabel(event.payload.nextTactic),
          ),
          encounterId: event.payload.encounterId,
          tactic: event.payload.nextTactic,
          phaseId: event.payload.phaseId,
        });
        break;
      case 'COMBAT_ENDED':
        this.append({
          id: this.nextId('log:combat', event.createdAt),
          kind: 'combat',
          createdAt: event.createdAt,
          summary: locale.logging.combatEndedSummary(
            formatCombatResultLabel(event.payload.result),
          ),
          encounterId: event.payload.encounterId,
          tactic: event.payload.finalTactic,
          result: event.payload.result,
        });
        break;
      case 'SAVE_CREATED':
        this.append({
          id: this.nextId('log:save', event.createdAt),
          kind: 'save-load',
          createdAt: event.createdAt,
          summary: locale.logging.saveCreatedSummary,
          operation: 'save-created',
          saveId: event.payload.saveId,
          source: event.payload.source,
        });
        break;
      case 'SAVE_RESTORED':
        this.append({
          id: this.nextId('log:save', event.createdAt),
          kind: 'save-load',
          createdAt: event.createdAt,
          summary: locale.logging.saveRestoredSummary,
          operation: 'save-restored',
          saveId: event.payload.saveId,
        });
        break;
      case 'WORLD_LOADED':
        this.append({
          id: this.nextId('log:save', event.createdAt),
          kind: 'save-load',
          createdAt: event.createdAt,
          summary: locale.logging.worldLoadedSummary(
            saveSourceLabels[event.payload.source],
          ),
          operation: 'world-loaded',
          saveId: event.payload.saveId,
          source: event.payload.source,
          reason: event.payload.reason,
        });
        break;
      default:
        break;
    }
  }

  recordNpcInteractionDetail(options: {
    npcId: string;
    createdAt: string;
    reply: string;
    dialogue: NpcDialogueTurn[];
    trustDelta: number;
    relationshipDelta: number;
    unlockedQuestIds: string[];
    explanation?: NpcInteractionExplanation;
  }) {
    this.append({
      id: this.nextId('log:npc-detail', options.createdAt),
      kind: 'npc-interaction',
      createdAt: options.createdAt,
      summary: locale.logging.npcDetailSummary,
      npcId: options.npcId,
      trustDelta: options.trustDelta,
      relationshipDelta: options.relationshipDelta,
      unlockedQuestIds: options.unlockedQuestIds,
      dialogue: options.dialogue,
      reply: options.reply,
      explanation: options.explanation,
    });
  }

  recordCombatDetail(options: {
    encounterId: string;
    createdAt: string;
    actionType: string;
    turn: number;
    tactic: EnemyTacticType;
    phaseId?: string;
  }) {
    this.append({
      id: this.nextId('log:combat-detail', options.createdAt),
      kind: 'combat',
      createdAt: options.createdAt,
      summary: locale.logging.combatDetailSummary(
        options.turn,
        combatActionLabels[options.actionType] ?? options.actionType,
        formatEnemyTacticLabel(options.tactic),
      ),
      encounterId: options.encounterId,
      actionType: options.actionType,
      turn: options.turn,
      tactic: options.tactic,
      phaseId: options.phaseId,
    });
  }

  recordAgentDecision(options: {
    agentId: AgentModuleId;
    createdAt: string;
    inputSummary: string;
    outputSummary: string;
    input: unknown;
    output: unknown;
  }) {
    this.append({
      id: this.nextId('log:agent', options.createdAt),
      kind: 'agent-decision',
      createdAt: options.createdAt,
      summary: locale.logging.agentDecisionSummary(agentLabels[options.agentId]),
      agentId: options.agentId,
      inputSummary: options.inputSummary,
      outputSummary: options.outputSummary,
      input: options.input,
      output: options.output,
    });
  }

  recordExplanationInput(options: {
    createdAt: string;
    encounterId?: string;
    questIds: string[];
    eventIds: string[];
    playerTags: PlayerProfileTag[];
    input: unknown;
  }) {
    this.append({
      id: this.nextId('log:explanation', options.createdAt),
      kind: 'explanation-input',
      createdAt: options.createdAt,
      summary: locale.logging.explanationInputSummary,
      encounterId: options.encounterId,
      questIds: options.questIds,
      eventIds: options.eventIds,
      playerTags: options.playerTags,
      input: options.input,
    });
  }
}

export const attachDomainEventLogging = (
  eventBus: GameEventBus,
  logger: GameLogger,
) => eventBus.subscribeAll((event) => logger.recordDomainEvent(event));
