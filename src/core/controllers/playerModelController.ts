import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type {
  CombatCommandAction,
  DifficultyLevel,
  NpcDialogueIntent,
  PlayerModelBehaviorReplayStep,
  PlayerModelDebugScenario,
  PlayerModelDebugSource,
  PlayerProfileTag,
} from '../schemas';
import { playerModelBehaviorReplayStepSchema } from '../schemas';
import {
  applyPlayerAreaVisitSignal,
  applyPlayerCombatChoiceSignal,
  applyPlayerExplorationSearchSignal,
  applyPlayerNpcInteractionSignal,
  applyPlayerQuestChoiceSignal,
  buildPlayerSystemReactionPreview,
  createPlayerModelInputFromState,
  createPlayerModelPreviewState,
  createDefaultPlayerModelState,
  evaluatePlayerModel,
  mergePlayerModelOutputs,
  type PlayerSystemReactionPreview,
} from '../rules';
import type { GameStoreState } from '../state';
import { formatPlayerTagLabel } from '../utils/displayLabels';
import { locale } from '../utils/locale';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';

interface PlayerModelControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  logger?: GameLogger;
  now?: TimestampProvider;
}

interface PlayerModelUpdateOptions {
  autoSave?: boolean;
  refresh?: boolean;
}

interface PlayerModelDebugCommitOptions {
  autoSave?: boolean;
  source: PlayerModelDebugSource;
  label: string;
}

export class PlayerModelController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  constructor(options: PlayerModelControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  private buildDebugProfileMarker(
    source: PlayerModelDebugSource,
    label: string,
  ) {
    return {
      injected: true,
      source,
      label,
    } as const;
  }

  private async evaluateModelState(
    currentState: GameStoreState['playerModel'],
    input: ReturnType<typeof createPlayerModelInputFromState>,
  ) {
    const ruleOutput = evaluatePlayerModel(input);
    const agentOutput = await this.agents.playerModel.run(input);
    const createdAt = this.now();
    const nextState = mergePlayerModelOutputs({
      currentState,
      ruleOutput,
      agentOutput,
      updatedAt: createdAt,
    });

    this.logger?.recordAgentDecision({
      agentId: 'player-model',
      createdAt,
      inputSummary: locale.controllers.playerModel.logs.inputSummary(
        input.recentAreaVisits.length,
        input.recentQuestChoices.length,
        input.npcInteractionCount,
      ),
      outputSummary: locale.controllers.playerModel.logs.outputSummary(
        nextState.tags.map(formatPlayerTagLabel),
      ),
      input,
      output: {
        ruleOutput,
        agentOutput,
        mergedTags: nextState.tags,
      },
    });

    return nextState;
  }

  private async finalizeDebugCommit(
    playerModel: GameStoreState['playerModel'],
    options: PlayerModelDebugCommitOptions,
  ) {
    const state = this.store.getState();
    const nextState = {
      ...playerModel,
      debugProfile: this.buildDebugProfileMarker(options.source, options.label),
      lastUpdatedAt: playerModel.lastUpdatedAt ?? this.now(),
    };

    this.commitPlayerModelState(nextState);
    state.patchDebugToolsState({
      debugModeEnabled: true,
      injectedPlayerTags: nextState.tags,
      logsPanelOpen: true,
    });

    if (options.autoSave !== false) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    return nextState;
  }

  private buildReplayInput(playerModel: GameStoreState['playerModel']) {
    return createPlayerModelInputFromState({
      recentAreaVisits: playerModel.recentAreaVisits,
      recentCombatActions: playerModel.recentCombatActions,
      recentNpcInteractionIntents: playerModel.recentNpcInteractionIntents,
      recentQuestChoices: playerModel.recentQuestChoices,
      combatSummary: null,
      combatHistory: [],
      npcInteractionCount: playerModel.npcInteractionCount,
      activeQuestCount: 0,
      completedQuestCount: 0,
      signalWeights: playerModel.signalWeights,
    });
  }

  private emitUpdated(tags: PlayerProfileTag[], dominantStyle?: PlayerProfileTag) {
    this.eventBus?.emit('PLAYER_MODEL_UPDATED', {
      tags,
      dominantStyle,
    });
  }

  private commitPlayerModelState(
    playerModel: GameStoreState['playerModel'],
    options?: {
      emit?: boolean;
    },
  ) {
    const state = this.store.getState();
    state.setPlayerModelState(playerModel);

    if (options?.emit !== false) {
      this.emitUpdated(playerModel.tags, playerModel.dominantStyle);
    }
  }

  private async finalizeWithoutRefresh(
    playerModel: GameStoreState['playerModel'],
    options?: PlayerModelUpdateOptions,
  ) {
    this.commitPlayerModelState(playerModel);

    if (options?.autoSave !== false) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        'auto',
        'player-model-update',
      );
    }

    return playerModel;
  }

  private async applySignalUpdate(
    playerModel: GameStoreState['playerModel'],
    options?: PlayerModelUpdateOptions,
  ) {
    this.commitPlayerModelState(playerModel, {
      emit: options?.refresh === false,
    });

    if (options?.refresh === false) {
      if (options.autoSave !== false) {
        await maybeAutoSave(
          this.store,
          this.saveController,
          'auto',
          'player-model-update',
        );
      }

      return playerModel;
    }

    return this.refreshPlayerModel({
      autoSave: options?.autoSave,
    });
  }

  async refreshPlayerModel(options?: {
    autoSave?: boolean;
  }) {
    const state = this.store.getState();
    const input = createPlayerModelInputFromState({
      recentAreaVisits: state.playerModel.recentAreaVisits,
      recentCombatActions: state.playerModel.recentCombatActions,
      recentNpcInteractionIntents: state.playerModel.recentNpcInteractionIntents,
      recentQuestChoices: state.playerModel.recentQuestChoices,
      combatSummary: state.combatState,
      combatHistory: state.combatHistory,
      npcInteractionCount: state.playerModel.npcInteractionCount,
      activeQuestCount: state.questProgressOrder.filter(
        (questId) => state.questProgressById[questId]?.status === 'active',
      ).length,
      completedQuestCount: state.questProgressOrder.filter(
        (questId) => state.questProgressById[questId]?.status === 'completed',
      ).length,
      signalWeights: state.playerModel.signalWeights,
    });
    const nextState = await this.evaluateModelState(state.playerModel, input);

    this.commitPlayerModelState(nextState);

    if (options?.autoSave !== false) {
      await maybeAutoSave(
        this.store,
        this.saveController,
        'auto',
        'player-model-update',
      );
    }

    return nextState;
  }

  async recordAreaVisit(
    areaId: string,
    options?: PlayerModelUpdateOptions & {
      appendRecentVisit?: boolean;
    },
  ) {
    const state = this.store.getState();

    return this.applySignalUpdate(
      {
        ...applyPlayerAreaVisitSignal(state.playerModel, areaId, {
          appendRecentVisit: options?.appendRecentVisit,
        }),
        lastUpdatedAt: this.now(),
      },
      options,
    );
  }

  async recordExplorationSearch(
    observation?: {
      resourceFound?: boolean;
      triggeredAmbush?: boolean;
    },
    options?: PlayerModelUpdateOptions,
  ) {
    const state = this.store.getState();

    return this.applySignalUpdate(
      {
        ...applyPlayerExplorationSearchSignal(state.playerModel, observation),
        lastUpdatedAt: this.now(),
      },
      options,
    );
  }

  async recordCombatChoice(
    actionType: CombatCommandAction,
    options?: PlayerModelUpdateOptions,
  ) {
    const state = this.store.getState();

    return this.applySignalUpdate(
      {
        ...applyPlayerCombatChoiceSignal(state.playerModel, actionType),
        lastUpdatedAt: this.now(),
      },
      options,
    );
  }

  async recordNpcInteraction(
    observation: {
      intent: NpcDialogueIntent;
      trustDelta?: number;
      relationshipDelta?: number;
    },
    options?: PlayerModelUpdateOptions,
  ) {
    const state = this.store.getState();

    return this.applySignalUpdate(
      {
        ...applyPlayerNpcInteractionSignal(state.playerModel, observation),
        lastUpdatedAt: this.now(),
      },
      options,
    );
  }

  async recordQuestChoice(
    choiceId: string,
    options?: PlayerModelUpdateOptions,
  ) {
    const state = this.store.getState();

    return this.applySignalUpdate(
      {
        ...applyPlayerQuestChoiceSignal(state.playerModel, choiceId),
        lastUpdatedAt: this.now(),
      },
      options,
    );
  }

  async injectPlayerTags(
    tags: PlayerProfileTag[],
    options?: {
      autoSave?: boolean;
      label?: string;
    },
  ) {
    const state = this.store.getState();
    const uniqueTags = [...new Set(tags)];
    const nextState = {
      ...state.playerModel,
      tags: uniqueTags,
      rationale: ['当前画像已通过调试入口手动注入，请结合系统反应对比验证。'],
      dominantStyle: uniqueTags[0],
      riskForecast: undefined,
      stuckPoint: undefined,
      lastUpdatedAt: this.now(),
    };

    return this.finalizeDebugCommit(nextState, {
      autoSave: options?.autoSave,
      source: 'manual-tags',
      label: options?.label ?? '手动标签注入',
    });
  }

  async replayBehaviorProfile(
    replaySteps: PlayerModelBehaviorReplayStep[],
    options?: {
      autoSave?: boolean;
      currentAreaId?: string;
      label?: string;
      source?: Extract<PlayerModelDebugSource, 'behavior-replay' | 'preset-scenario'>;
    },
  ) {
    const steps = playerModelBehaviorReplayStepSchema.array().parse(replaySteps);
    const state = this.store.getState();
    const currentAreaId = options?.currentAreaId ?? state.player.currentAreaId;
    let replayState = createDefaultPlayerModelState([], currentAreaId);

    replayState = {
      ...replayState,
      recentAreaVisits: [],
    };

    for (const step of steps) {
      switch (step.kind) {
        case 'area-visit':
          replayState = applyPlayerAreaVisitSignal(replayState, step.areaId, {
            appendRecentVisit: step.appendRecentVisit,
          });
          break;
        case 'exploration-search':
          replayState = applyPlayerExplorationSearchSignal(replayState, {
            resourceFound: step.resourceFound,
            triggeredAmbush: step.triggeredAmbush,
          });
          break;
        case 'combat-choice':
          replayState = applyPlayerCombatChoiceSignal(replayState, step.actionType);
          break;
        case 'npc-interaction':
          replayState = applyPlayerNpcInteractionSignal(replayState, {
            intent: step.intent,
            trustDelta: step.trustDelta,
            relationshipDelta: step.relationshipDelta,
          });
          break;
        case 'quest-choice':
          replayState = applyPlayerQuestChoiceSignal(replayState, step.choiceId);
          break;
      }
    }

    const evaluatedState = await this.evaluateModelState(
      replayState,
      this.buildReplayInput(replayState),
    );

    return this.finalizeDebugCommit(evaluatedState, {
      autoSave: options?.autoSave,
      source: options?.source ?? 'behavior-replay',
      label: options?.label ?? '行为回放生成',
    });
  }

  async applyDebugScenario(
    scenario: PlayerModelDebugScenario,
    options?: {
      autoSave?: boolean;
      currentAreaId?: string;
    },
  ) {
    return this.replayBehaviorProfile(scenario.replaySteps, {
      autoSave: options?.autoSave,
      currentAreaId: options?.currentAreaId,
      label: scenario.label,
      source: 'preset-scenario',
    });
  }

  async clearInjectedPlayerProfile(options?: {
    autoSave?: boolean;
  }) {
    const state = this.store.getState();
    const baseState = {
      ...state.playerModel,
      debugProfile: undefined,
      lastUpdatedAt: this.now(),
    };

    this.commitPlayerModelState(baseState, {
      emit: false,
    });
    state.patchDebugToolsState({
      injectedPlayerTags: [],
    });

    return this.refreshPlayerModel({
      autoSave: options?.autoSave,
    });
  }

  previewSystemReactions(options: {
    tags: PlayerProfileTag[];
    difficulty?: DifficultyLevel;
    npcIntent?: NpcDialogueIntent;
    rationale?: string[];
    dominantStyle?: PlayerProfileTag;
    riskForecast?: string;
    stuckPoint?: string;
  }): PlayerSystemReactionPreview {
    const state = this.store.getState();
    return buildPlayerSystemReactionPreview({
      playerModel: createPlayerModelPreviewState({
        tags: options.tags,
        rationale: options.rationale,
        dominantStyle: options.dominantStyle,
        riskForecast: options.riskForecast,
        stuckPoint: options.stuckPoint,
      }),
      difficulty: options.difficulty ?? state.gameConfig.difficulty,
      npcIntent: options.npcIntent ?? 'quest',
    });
  }

  compareProfileReactions(options: {
    leftTags: PlayerProfileTag[];
    rightTags: PlayerProfileTag[];
    difficulty?: DifficultyLevel;
    npcIntent?: NpcDialogueIntent;
  }) {
    return {
      left: this.previewSystemReactions({
        tags: options.leftTags,
        difficulty: options.difficulty,
        npcIntent: options.npcIntent,
      }),
      right: this.previewSystemReactions({
        tags: options.rightTags,
        difficulty: options.difficulty,
        npcIntent: options.npcIntent,
      }),
    };
  }

  async replacePlayerModelState(
    playerModel: GameStoreState['playerModel'],
    options?: PlayerModelUpdateOptions,
  ) {
    const nextState = {
      ...playerModel,
      lastUpdatedAt: playerModel.lastUpdatedAt ?? this.now(),
    };

    return this.finalizeWithoutRefresh(nextState, options);
  }
}
