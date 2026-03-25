import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { GameStoreState } from '../state';
import { locale } from '../utils/locale';

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

  async generateReview() {
    const state = this.store.getState();
    const encounter = state.combatState
      ? state.combatEncountersById[state.combatState.encounterId] ?? null
      : null;
    const input = {
      player: state.player,
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
        state.combatState?.encounterId ?? locale.controllers.reviewGeneration.noEncounter,
        input.questProgress.length,
        input.eventHistory.length,
      ),
      outputSummary: locale.controllers.reviewGeneration.logs.outputSummary(
        result.review.explanations.length,
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
    state.setActivePanel('review');

    this.eventBus?.emit('REVIEW_GENERATED', {
      encounterId: review.encounterId,
      explanationCount: review.explanations.length,
      suggestionCount: review.suggestions.length,
    });

    await maybeAutoSave(this.store, this.saveController, 'auto');

    return review;
  }
}
