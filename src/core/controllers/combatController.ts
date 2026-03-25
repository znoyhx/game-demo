import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import { resolveAreaEnvironmentState } from '../rules/areaRules';
import type { CombatActionType } from '../rules';
import type { GameStoreState } from '../state';
import {
  applyDebugCombatPhase,
  allowedCombatActions,
  buildCombatHistoryEntry,
  resolvePreferredCombatTactic,
  resolveCombatRound,
} from '../rules';
import { formatEnemyTacticLabel, formatPlayerTagLabel } from '../utils/displayLabels';
import { locale } from '../utils/locale';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { ReviewGenerationController } from './reviewGenerationController';

const deriveCommonPlayerActions = (
  combatState: NonNullable<GameStoreState['combatState']>,
): CombatActionType[] => {
  const counts = new Map<CombatActionType, { count: number; lastSeen: number }>();

  combatState.logs.forEach((log, logIndex) => {
    log.actions.forEach((action) => {
      if (
        action.actor !== 'player' ||
        !allowedCombatActions.includes(action.actionType as CombatActionType)
      ) {
        return;
      }

      const typedAction = action.actionType as CombatActionType;
      const current = counts.get(typedAction);
      counts.set(typedAction, {
        count: (current?.count ?? 0) + 1,
        lastSeen: logIndex,
      });
    });
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (left[1].count !== right[1].count) {
        return right[1].count - left[1].count;
      }

      return right[1].lastSeen - left[1].lastSeen;
    })
    .slice(0, 3)
    .map(([action]) => action);
};

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
    const initialPhaseId = encounter.bossPhases?.[0]?.id;
    const forcedTactic =
      state.debugTools.forcedTactic &&
      encounter.tacticPool.includes(state.debugTools.forcedTactic)
        ? state.debugTools.forcedTactic
        : null;

    let combatState: NonNullable<GameStoreState['combatState']> = {
      encounterId: encounter.id,
      turn: 1,
      currentPhaseId: initialPhaseId,
      activeTactic: resolvePreferredCombatTactic({
        encounter,
        phaseId: initialPhaseId,
        preferredTactic: forcedTactic,
        fallbackTactic: encounter.tacticPool[0],
      }),
      player: {
        id: 'combatant:player',
        name: locale.controllers.combat.playerCombatantName,
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
    };

    if (state.debugTools.forcedPhaseId) {
      const forcedPhase = applyDebugCombatPhase({
        encounter,
        combatState,
        forcedPhaseId: state.debugTools.forcedPhaseId,
        preferredTactic: forcedTactic,
        addLog: false,
      });

      if (forcedPhase.ok) {
        combatState = forcedPhase.combatState;
      }
    }

    state.setCombatState(combatState);
    state.setActivePanel('combat');

    this.eventBus?.emit('COMBAT_STARTED', {
      encounterId,
      areaId: encounter.areaId,
      initialTactic: combatState.activeTactic,
    });

    return this.store.getState().combatState;
  }

  async forceBossPhase(phaseId: string) {
    const state = this.store.getState();
    const combatState = state.combatState;

    if (!combatState) {
      return null;
    }

    const encounter = state.combatEncountersById[combatState.encounterId];
    if (!encounter) {
      return null;
    }

    const forcedPhase = applyDebugCombatPhase({
      encounter,
      combatState,
      forcedPhaseId: phaseId,
      preferredTactic: state.debugTools.forcedTactic,
      addLog: true,
    });

    if (!forcedPhase.ok) {
      return forcedPhase;
    }

    state.setCombatState(forcedPhase.combatState);

    if (
      combatState.currentPhaseId !== forcedPhase.combatState.currentPhaseId ||
      combatState.activeTactic !== forcedPhase.combatState.activeTactic
    ) {
      this.eventBus?.emit('TACTIC_CHANGED', {
        encounterId: combatState.encounterId,
        previousTactic: combatState.activeTactic,
        nextTactic: forcedPhase.combatState.activeTactic,
        phaseId: forcedPhase.combatState.currentPhaseId,
      });
    }

    return forcedPhase.combatState;
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

    const encounterArea = state.areasById[encounter.areaId];
    const environmentState = encounterArea
      ? resolveAreaEnvironmentState(encounterArea, state.worldRuntime.flags)
      : undefined;
    const commonPlayerActions = deriveCommonPlayerActions(combatState);

    const tacticSelection = await this.agents.enemyTactician.run({
      encounter,
      combatState,
      playerState: state.player,
      playerTags: state.playerModel.tags,
      commonPlayerActions,
      environmentState: environmentState
        ? {
            areaId: encounter.areaId,
            label: environmentState.label,
            hazard: environmentState.hazard,
            weather: environmentState.weather,
            lighting: environmentState.lighting,
          }
        : undefined,
      bossPhaseId: combatState.currentPhaseId,
    });
    const selectedTactic =
      state.debugTools.forcedTactic &&
      encounter.tacticPool.includes(state.debugTools.forcedTactic)
        ? state.debugTools.forcedTactic
        : tacticSelection.selectedTactic;
    const createdAt = this.now();
    this.logger?.recordAgentDecision({
      agentId: 'enemy-tactician',
      createdAt,
      inputSummary: locale.controllers.combat.logs.tacticianInput(
        encounter.id,
        combatState.turn,
        state.playerModel.tags.map(formatPlayerTagLabel),
      ),
      outputSummary: locale.controllers.combat.logs.tacticianOutput(
        formatEnemyTacticLabel(selectedTactic),
      ),
      input: {
        encounterId: encounter.id,
        turn: combatState.turn,
        bossPhaseId: combatState.currentPhaseId,
        playerHp: state.player.hp,
        playerEnergy: state.player.energy,
        commonPlayerActions,
        environmentState,
        playerTags: state.playerModel.tags,
      },
      output: {
        ...tacticSelection,
        selectedTactic,
      },
    });
    const round = resolveCombatRound({
      encounter,
      combatState,
      playerState: state.player,
      playerActionType: actionType as CombatActionType,
      enemyTactic: selectedTactic,
      commonPlayerActions,
      environmentState: environmentState
        ? {
            areaId: encounter.areaId,
            label: environmentState.label,
            hazard: environmentState.hazard,
            weather: environmentState.weather,
            lighting: environmentState.lighting,
          }
        : undefined,
    });

    if (!round.ok) {
      return round;
    }

    state.setCombatState(round.combatState);
    state.patchPlayerState({
      hp: round.playerState.hp,
      energy: round.playerState.energy,
    });
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
      state.appendCombatHistory(
        buildCombatHistoryEntry({
          encounter,
          combatState: round.combatState,
          resolvedAt: createdAt,
        }),
      );

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
