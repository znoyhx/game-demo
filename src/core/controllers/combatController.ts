import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { CombatActionType } from '../rules';
import type { GameStoreState } from '../state';
import { resolveCombatRound } from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { ReviewGenerationController } from './reviewGenerationController';

interface CombatControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  reviewController?: ReviewGenerationController;
  logger?: GameLogger;
  now?: TimestampProvider;
}

export class CombatController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly reviewController?: ReviewGenerationController;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  constructor(options: CombatControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.reviewController = options.reviewController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async startEncounter(encounterId: string) {
    const state = this.store.getState();
    const encounter = state.combatEncountersById[encounterId];

    if (!encounter) {
      return null;
    }

    const enemyNpc = encounter.enemyNpcId
      ? state.npcDefinitionsById[encounter.enemyNpcId]
      : undefined;
    const initialTactic = encounter.tacticPool[0];
    const initialPhaseId = encounter.bossPhases?.[0]?.id;

    state.setCombatState({
      encounterId: encounter.id,
      turn: 1,
      currentPhaseId: initialPhaseId,
      activeTactic: initialTactic,
      player: {
        id: 'combatant:player',
        name: 'Player',
        hp: state.player.hp,
        maxHp: state.player.maxHp,
      },
      enemy: {
        id: enemyNpc?.id ?? 'combatant:enemy',
        name: enemyNpc?.name ?? encounter.title,
        hp: 90,
        maxHp: 90,
      },
      logs: [],
    });
    state.setActivePanel('combat');

    this.eventBus?.emit('COMBAT_STARTED', {
      encounterId,
      areaId: encounter.areaId,
      initialTactic,
    });

    return this.store.getState().combatState;
  }

  async submitPlayerAction(actionType: string) {
    const state = this.store.getState();
    const combatState = state.combatState;

    if (!combatState) {
      return null;
    }

    const encounter = state.combatEncountersById[combatState.encounterId];
    if (!encounter) {
      return null;
    }

    const tacticSelection = await this.agents.enemyTactician.run({
      encounter,
      combatState,
      playerTags: state.playerModel.tags,
    });
    const createdAt = this.now();
    this.logger?.recordAgentDecision({
      agentId: 'enemy-tactician',
      createdAt,
      inputSummary: `Encounter=${encounter.id}, turn=${combatState.turn}, tags=${state.playerModel.tags.join(',')}`,
      outputSummary: `Selected tactic ${tacticSelection.selectedTactic}`,
      input: {
        encounterId: encounter.id,
        turn: combatState.turn,
        playerTags: state.playerModel.tags,
      },
      output: tacticSelection,
    });
    const round = resolveCombatRound({
      encounter,
      combatState,
      playerActionType: actionType as CombatActionType,
      enemyTactic: tacticSelection.selectedTactic,
    });

    if (!round.ok) {
      return round;
    }

    state.setCombatState(round.combatState);
    this.logger?.recordCombatDetail({
      encounterId: combatState.encounterId,
      createdAt,
      actionType,
      turn: round.combatState.turn,
      tactic: round.combatState.activeTactic,
      phaseId: round.phase.nextPhaseId,
    });

    if (
      combatState.activeTactic !== round.combatState.activeTactic ||
      round.phase.changed
    ) {
      this.eventBus?.emit('TACTIC_CHANGED', {
        encounterId: combatState.encounterId,
        previousTactic: combatState.activeTactic,
        nextTactic: round.combatState.activeTactic,
        phaseId: round.phase.nextPhaseId,
      });
    }

    if (round.result) {
      state.appendCombatHistory({
        encounterId: combatState.encounterId,
        result: round.result,
        finalTactic: round.combatState.activeTactic,
        resolvedAt: createdAt,
      });

      this.eventBus?.emit('COMBAT_ENDED', {
        encounterId: combatState.encounterId,
        result: round.result,
        finalTactic: round.combatState.activeTactic,
      });

      await this.reviewController?.generateReview();
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return round;
  }

  async endEncounter() {
    const state = this.store.getState();
    state.clearCombatState();
    state.setActivePanel('map');
  }
}
