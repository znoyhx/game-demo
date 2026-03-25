import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type {
  ReviewReconstructionTarget,
  ReviewRequest,
  SaveSnapshot,
} from '../schemas';
import type { GameStoreState } from '../state';
import { locale } from '../utils/locale';
import { buildExplainCoachInputFromSnapshot } from '../rules';
import { reviewReconstructionTargetSchema, saveSnapshotSchema } from '../schemas';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';

interface ReviewGenerationControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  logger?: GameLogger;
  now?: TimestampProvider;
}

export interface GenerateReviewOptions {
  request?: ReviewRequest;
  autoOpenPanel?: boolean;
  autoSave?: boolean;
}

export interface ReconstructReviewOptions {
  snapshot?: SaveSnapshot;
  target?: ReviewReconstructionTarget;
  autoOpenPanel?: boolean;
  autoSave?: boolean;
  appendToHistory?: boolean;
}

export class ReviewGenerationController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  constructor(options: ReviewGenerationControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async generateReview(options?: GenerateReviewOptions) {
    const state = this.store.getState();
    const encounter = state.combatState
      ? state.combatEncountersById[state.combatState.encounterId] ?? null
      : null;
    const reviewRequest: ReviewRequest = options?.request ?? {
      trigger: state.combatState ? 'combat' : 'manual',
    };
    const input = {
      player: state.player,
      playerModel: state.playerModel,
      difficulty: state.gameConfig.difficulty,
      reviewRequest,
      reviewHistory: state.reviewState.history,
      encounter,
      combat: state.combatState,
      combatHistory: state.combatHistory,
      questProgress: state.questProgressOrder.map(
        (questId) => state.questProgressById[questId],
      ),
      eventHistory: state.eventHistory,
    };
    const createdAt = this.now();
    this.logger?.recordExplanationInput({
      createdAt,
      encounterId: state.combatState?.encounterId,
      questIds: input.questProgress.map((quest) => quest.questId),
      eventIds: input.eventHistory.map((event) => event.eventId),
      playerTags: state.playerModel.tags,
      input,
    });
    const result = await this.agents.explainCoach.run(input);
    this.logger?.recordAgentDecision({
      agentId: 'explain-coach',
      createdAt,
      inputSummary: locale.controllers.reviewGeneration.logs.inputSummary(
        locale.controllers.reviewGeneration.triggers[reviewRequest.trigger],
        state.combatState?.encounterId ?? locale.controllers.reviewGeneration.noEncounter,
        input.questProgress.length,
        input.eventHistory.length,
      ),
      outputSummary: locale.controllers.reviewGeneration.logs.outputSummary(
        result.review.explanations.length,
        result.review.outcomeFactors.length,
      ),
      input,
      output: result,
    });

    const review = {
      ...result.review,
      generatedAt: createdAt,
    };

    state.appendReviewHistory(review);
    state.setCurrentReview(review);

    if (options?.autoOpenPanel !== false) {
      state.setActivePanel('review');
    }

    this.eventBus?.emit('REVIEW_GENERATED', {
      encounterId: review.encounterId,
      explanationCount: review.explanations.length,
      suggestionCount: review.suggestions.length,
    });

    if (options?.autoSave !== false) {
      await maybeAutoSave(this.store, this.saveController, 'auto');
    }

    return review;
  }

  async reconstructReviewFromSnapshot(options?: ReconstructReviewOptions) {
    const target = reviewReconstructionTargetSchema.parse(options?.target ?? {});
    const snapshot = saveSnapshotSchema.parse(
      options?.snapshot ?? this.store.getState().exportSaveSnapshot(),
    );
    const input = buildExplainCoachInputFromSnapshot({
      snapshot,
      target,
    });
    const latestCombatHistory = input.combatHistory[input.combatHistory.length - 1];
    const latestQuestUpdate =
      [...snapshot.quests.history]
        .reverse()
        .find((entry) =>
          input.reviewRequest.questBranch
            ? entry.questId === input.reviewRequest.questBranch.questId
            : input.reviewRequest.runOutcome?.questId
              ? entry.questId === input.reviewRequest.runOutcome.questId
              : false,
        )?.updatedAt ??
      snapshot.quests.progress.find((entry) =>
        input.reviewRequest.questBranch
          ? entry.questId === input.reviewRequest.questBranch.questId
          : input.reviewRequest.runOutcome?.questId
            ? entry.questId === input.reviewRequest.runOutcome.questId
            : false,
      )?.updatedAt;
    const latestNpcInteractionAt =
      snapshot.npcs.runtime.find((entry) =>
        input.reviewRequest.npcInteraction
          ? entry.npcId === input.reviewRequest.npcInteraction.npcId
          : false,
      )?.memory.lastInteractionAt;
    const latestEventAt = input.eventHistory[input.eventHistory.length - 1]?.triggeredAt;
    const createdAt =
      latestCombatHistory?.resolvedAt ??
      latestQuestUpdate ??
      latestNpcInteractionAt ??
      latestEventAt ??
      snapshot.metadata.updatedAt;

    this.logger?.recordExplanationInput({
      createdAt,
      encounterId: input.encounter?.id ?? latestCombatHistory?.encounterId,
      questIds: input.questProgress.map((quest) => quest.questId),
      eventIds: input.eventHistory.map((event) => event.eventId),
      playerTags: input.playerModel.tags,
      input,
    });

    const result = await this.agents.explainCoach.run(input);

    this.logger?.recordAgentDecision({
      agentId: 'explain-coach',
      createdAt,
      inputSummary: locale.controllers.reviewGeneration.logs.inputSummary(
        locale.controllers.reviewGeneration.triggers[input.reviewRequest.trigger],
        input.encounter?.id ??
          latestCombatHistory?.encounterId ??
          locale.controllers.reviewGeneration.noEncounter,
        input.questProgress.length,
        input.eventHistory.length,
      ),
      outputSummary: locale.controllers.reviewGeneration.logs.outputSummary(
        result.review.explanations.length,
        result.review.outcomeFactors.length,
      ),
      input,
      output: result,
    });

    const review = {
      ...result.review,
      generatedAt: createdAt,
    };
    const state = this.store.getState();

    if (options?.appendToHistory) {
      state.appendReviewHistory(review);
    } else {
      state.setCurrentReview(review);
    }

    if (options?.autoOpenPanel !== false) {
      state.setActivePanel('review');
    }

    this.eventBus?.emit('REVIEW_GENERATED', {
      encounterId: review.encounterId,
      explanationCount: review.explanations.length,
      suggestionCount: review.suggestions.length,
    });

    if (options?.autoSave) {
      await maybeAutoSave(this.store, this.saveController, 'debug');
    }

    return review;
  }
}
