import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { PlayerProfileTag } from '../schemas';
import type { GameStoreState } from '../state';

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

  async refreshPlayerModel() {
    const state = this.store.getState();
    const output = await this.agents.playerModel.run({
      recentAreaVisits: state.playerModel.recentAreaVisits,
      recentQuestChoices: state.playerModel.recentQuestChoices,
      combatSummary: state.combatState,
      npcInteractionCount: state.playerModel.npcInteractionCount,
    });
    const createdAt = this.now();
    this.logger?.recordAgentDecision({
      agentId: 'player-model',
      createdAt,
      inputSummary: `areas=${state.playerModel.recentAreaVisits.length}, quests=${state.playerModel.recentQuestChoices.length}, npcInteractions=${state.playerModel.npcInteractionCount}`,
      outputSummary: `Tags=${output.tags.join(',')}`,
      input: {
        recentAreaVisits: state.playerModel.recentAreaVisits,
        recentQuestChoices: state.playerModel.recentQuestChoices,
        npcInteractionCount: state.playerModel.npcInteractionCount,
      },
      output,
    });

    const nextState = {
      ...state.playerModel,
      tags: output.tags,
      rationale: output.rationale ?? state.playerModel.rationale,
      dominantStyle: output.tags[0],
      lastUpdatedAt: createdAt,
    };

    state.setPlayerModelState(nextState);

    this.eventBus?.emit('PLAYER_MODEL_UPDATED', {
      tags: output.tags,
      dominantStyle: nextState.dominantStyle,
    });

    await maybeAutoSave(this.store, this.saveController, 'auto');

    return nextState;
  }

  async injectPlayerTags(tags: PlayerProfileTag[]) {
    const state = this.store.getState();
    state.setPlayerModelState({
      ...state.playerModel,
      tags,
      dominantStyle: tags[0],
      lastUpdatedAt: this.now(),
    });
    state.patchDebugToolsState({
      injectedPlayerTags: tags,
    });

    this.eventBus?.emit('PLAYER_MODEL_UPDATED', {
      tags,
      dominantStyle: tags[0],
    });

    await maybeAutoSave(this.store, this.saveController, 'debug');
  }
}
