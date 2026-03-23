import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type { NpcDialogueTurn } from '../schemas';
import type { GameStoreState } from '../state';
import { applyNpcRelationChange } from '../rules';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import { QuestProgressionController } from './questProgressionController';

interface NpcInteractionControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  questController?: QuestProgressionController;
  logger?: GameLogger;
  now?: TimestampProvider;
}

const dialogueOptionText: Record<string, string> = {
  greet: 'We should coordinate before the valley slips any further.',
  ask: 'Tell me what the last patrol saw.',
  trade: 'Show me what you can spare for the road ahead.',
  quest: 'I am ready to take the next assignment.',
  persuade: 'Trust me. I can carry this through.',
  leave: 'We will speak again soon.',
};

export class NpcInteractionController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly questController?: QuestProgressionController;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  private readonly dialogueHistoryByNpcId = new Map<string, NpcDialogueTurn[]>();

  constructor(options: NpcInteractionControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.questController = options.questController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async startDialogue(npcId: string) {
    const state = this.store.getState();
    const npcDefinition = state.npcDefinitionsById[npcId];

    if (!npcDefinition) {
      return null;
    }

    state.setSelectedNpcId(npcId);
    state.setActivePanel('npc');
    this.dialogueHistoryByNpcId.set(npcId, []);

    return {
      npcId,
      npcName: npcDefinition.name,
      history: [],
    };
  }

  async chooseDialogueOption(npcId: string, optionId: string) {
    const state = this.store.getState();
    const npcDefinition = state.npcDefinitionsById[npcId];
    const npcState = state.npcStatesById[npcId];

    if (!npcDefinition || !npcState) {
      return null;
    }

    const playerText = dialogueOptionText[optionId] ?? dialogueOptionText.ask;
    const recentDialogue = [
      ...(this.dialogueHistoryByNpcId.get(npcId) ?? []),
      {
        speaker: 'player' as const,
        text: playerText,
      },
    ];

    const output = await this.agents.npcBrain.run({
      npcDefinition,
      npcState,
      activeQuests: state.questProgressOrder.map(
        (questId) => state.questProgressById[questId],
      ),
      playerState: state.player,
      recentDialogue,
    });
    const createdAt = this.now();
    this.logger?.recordAgentDecision({
      agentId: 'npc-brain',
      createdAt,
      inputSummary: `NPC=${npcId}, dialogueTurns=${recentDialogue.length}`,
      outputSummary: `Disposition=${output.updatedDisposition ?? npcState.currentDisposition}, unlockedQuests=${output.unlockedQuestIds?.length ?? 0}`,
      input: {
        npcId,
        recentDialogue,
      },
      output,
    });

    const relationUpdate = applyNpcRelationChange(npcState, {
      trustDelta: output.trustDelta,
      relationshipDelta: output.relationshipDelta,
      memoryNote: output.explanationHint ?? output.npcReply,
      timestamp: createdAt,
    });

    state.upsertNpcState({
      ...relationUpdate.state,
      currentDisposition:
        output.updatedDisposition ?? relationUpdate.state.currentDisposition,
    });
    state.setPlayerModelState({
      ...state.playerModel,
      npcInteractionCount: state.playerModel.npcInteractionCount + 1,
      lastUpdatedAt: this.now(),
    });

    this.dialogueHistoryByNpcId.set(npcId, [
      ...recentDialogue,
      {
        speaker: 'npc',
        text: output.npcReply,
      },
    ]);
    this.logger?.recordNpcInteractionDetail({
      npcId,
      createdAt,
      reply: output.npcReply,
      dialogue: this.dialogueHistoryByNpcId.get(npcId) ?? [],
      trustDelta: output.trustDelta ?? 0,
      relationshipDelta: output.relationshipDelta ?? 0,
      unlockedQuestIds: output.unlockedQuestIds ?? [],
    });

    for (const unlockedQuestId of output.unlockedQuestIds ?? []) {
      await this.questController?.activateQuest(unlockedQuestId);
    }

    this.eventBus?.emit('NPC_INTERACTED', {
      npcId,
      trustDelta: output.trustDelta ?? 0,
      relationshipDelta: output.relationshipDelta ?? 0,
      disposition:
        output.updatedDisposition ?? relationUpdate.state.currentDisposition,
      unlockedQuestIds: output.unlockedQuestIds ?? [],
    });

    await maybeAutoSave(this.store, this.saveController, 'auto');

    return {
      npcReply: output.npcReply,
      history: this.dialogueHistoryByNpcId.get(npcId) ?? [],
      state: this.store.getState().npcStatesById[npcId],
    };
  }

  async endDialogue(npcId: string) {
    this.dialogueHistoryByNpcId.delete(npcId);
    const state = this.store.getState();
    state.setActivePanel('map');
    state.setSelectedNpcId(null);
  }
}
