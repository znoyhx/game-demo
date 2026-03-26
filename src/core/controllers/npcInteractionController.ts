import type { StoreApi } from 'zustand/vanilla';

import type { AgentSet } from '../agents';
import type { GameEventBus } from '../events/domainEvents';
import type { GameLogger } from '../logging';
import type {
  NpcDialogueIntent,
  NpcDialogueSession,
  NpcDialogueTurn,
} from '../schemas';
import { npcDialogueSessionSchema } from '../schemas';
import type { GameStoreState } from '../state';
import {
  applyNpcInteractionStateChange,
  applyNpcItemExchange,
  buildNpcInteractionExplanation,
  resolveNpcKnowledgeDisclosure,
} from '../rules';
import { npcInteractionText } from '../utils/locale/npcInteractionText';

import {
  defaultTimestampProvider,
  maybeAutoSave,
  type SaveWriter,
  type TimestampProvider,
} from './controllerUtils';
import type { PlayerModelController } from './playerModelController';
import { QuestProgressionController } from './questProgressionController';
import type { ReviewGenerationController } from './reviewGenerationController';

interface NpcInteractionControllerOptions {
  store: StoreApi<GameStoreState>;
  agents: AgentSet;
  eventBus?: GameEventBus;
  saveController?: SaveWriter;
  questController?: QuestProgressionController;
  playerModelController?: PlayerModelController;
  reviewController?: ReviewGenerationController;
  logger?: GameLogger;
  now?: TimestampProvider;
}

const dialogueOptionText = npcInteractionText.dialogueOptions;

const isDialogueIntent = (value: string): value is NpcDialogueIntent =>
  value in dialogueOptionText;

const isMajorNpcInteraction = (options: {
  trustDelta: number;
  relationshipDelta: number;
  explanationReasons: string[];
  disclosedInfoCount: number;
  unlockedQuestCount: number;
}) =>
  Math.abs(options.trustDelta) >= 3 ||
  Math.abs(options.relationshipDelta) >= 3 ||
  options.explanationReasons.length > 0 ||
  options.disclosedInfoCount > 0 ||
  options.unlockedQuestCount > 0;

export class NpcInteractionController {
  private readonly store: StoreApi<GameStoreState>;

  private readonly agents: AgentSet;

  private readonly eventBus?: GameEventBus;

  private readonly saveController?: SaveWriter;

  private readonly questController?: QuestProgressionController;

  private readonly playerModelController?: PlayerModelController;

  private readonly reviewController?: ReviewGenerationController;

  private readonly logger?: GameLogger;

  private readonly now: TimestampProvider;

  private readonly dialogueSessionsByNpcId = new Map<string, NpcDialogueSession>();

  constructor(options: NpcInteractionControllerOptions) {
    this.store = options.store;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.saveController = options.saveController;
    this.questController = options.questController;
    this.playerModelController = options.playerModelController;
    this.reviewController = options.reviewController;
    this.logger = options.logger;
    this.now = options.now ?? defaultTimestampProvider;
  }

  async startDialogue(npcId: string) {
    const state = this.store.getState();
    const npcDefinition = state.npcDefinitionsById[npcId];
    const npcState = state.npcStatesById[npcId];

    if (!npcDefinition || !npcState) {
      return null;
    }

    state.setSelectedNpcId(npcId);
    state.setActivePanel('npc');

    const history: NpcDialogueTurn[] = [
      {
        speaker: 'npc',
        text: npcInteractionText.openingLine(
          npcDefinition.name,
          npcState.emotionalState,
          npcState.currentGoal,
        ),
      },
    ];

    const session = npcDialogueSessionSchema.parse({
      npcId,
      npcName: npcDefinition.name,
      history,
      state: npcState,
    });

    this.dialogueSessionsByNpcId.set(npcId, session);

    return session;
  }

  async chooseDialogueOption(npcId: string, optionId: string) {
    const state = this.store.getState();
    const npcDefinition = state.npcDefinitionsById[npcId];
    const npcState = state.npcStatesById[npcId];

    if (!npcDefinition || !npcState) {
      return null;
    }

    const intent = isDialogueIntent(optionId) ? optionId : 'ask';
    const playerText = dialogueOptionText[intent];
    const currentSession = this.dialogueSessionsByNpcId.get(npcId);
    const recentDialogue = [
      ...(currentSession?.history ?? []),
      {
        speaker: 'player' as const,
        text: playerText,
      },
    ];
    const questDefinitions = state.questDefinitionOrder.map(
      (questId) => state.questDefinitionsById[questId],
    );
    const questProgressEntries = state.questProgressOrder.map(
      (questId) => state.questProgressById[questId],
    );
    const createdAt = this.now();

    const output = await this.agents.npcBrain.run({
      npcDefinition,
      npcState,
      questDefinitions,
      questProgressEntries,
      playerState: state.player,
      playerModel: state.playerModel,
      selectedIntent: intent,
      recentDialogue,
    });

    this.logger?.recordAgentDecision({
      agentId: 'npc-brain',
      createdAt,
      inputSummary: `角色=${npcId}，对话轮次=${recentDialogue.length}`,
      outputSummary: `任务发放=${output.questOfferIds.length}，物资交换=${output.itemTransfers.length}`,
      input: {
        npcId,
        recentDialogue,
      },
      output,
    });

    const interactionUpdate = applyNpcInteractionStateChange(npcState, {
      trustDelta: output.trustDelta,
      relationshipDelta: output.relationshipDelta,
      memoryNote: output.memoryNote ?? output.explanationHint ?? output.npcReply,
      longTermMemoryNote: output.longTermMemoryNote,
      intent,
      issuedQuestIds: output.questOfferIds,
      relationshipNetworkChanges: output.relationshipNetworkChanges,
      timestamp: createdAt,
    });
    const disclosure = resolveNpcKnowledgeDisclosure(
      interactionUpdate.state,
      intent,
    );
    const finalNpcUpdate = applyNpcInteractionStateChange(interactionUpdate.state, {
      intent,
      disclosedFacts: disclosure.facts,
      disclosedSecrets: disclosure.secrets,
      timestamp: createdAt,
    });

    state.upsertNpcState(finalNpcUpdate.state);

    const tradeResult = applyNpcItemExchange(
      this.store.getState().player,
      output.itemTransfers,
      output.playerGoldDelta,
    );
    if (tradeResult.ok) {
      this.store.getState().setPlayerState(tradeResult.playerState);
    }

    const questTitlesById = Object.fromEntries(
      questDefinitions.map((quest) => [quest.id, quest.title]),
    );

    for (const questId of output.questOfferIds) {
      await this.questController?.activateQuest(questId, {
        autoSave: false,
      });
    }

    await this.questController?.applyTrigger(
      {
        type: 'talk',
        targetId: npcId,
        note: npcInteractionText.talkTriggerNote(npcDefinition.name),
      },
      undefined,
      {
        autoSave: false,
        saveSource: 'auto',
      },
    );
    await this.questController?.refreshQuestStatuses({
      autoSave: false,
    });

    await this.playerModelController?.recordNpcInteraction(
      {
        intent,
        trustDelta: output.trustDelta,
        relationshipDelta: output.relationshipDelta,
      },
      {
        autoSave: false,
      },
    );

    const tradeTurns =
      tradeResult.ok && (output.itemTransfers.length > 0 || output.playerGoldDelta !== 0)
        ? [
            ...(output.playerGoldDelta !== 0
              ? [
                  {
                    speaker: 'system' as const,
                    text: npcInteractionText.tradeGoldLine(output.playerGoldDelta),
                  },
                ]
              : []),
            ...output.itemTransfers.map((transfer) => ({
              speaker: 'system' as const,
              text: npcInteractionText.tradeItemLine(transfer),
            })),
          ]
        : intent === 'trade'
          ? [
              {
                speaker: 'system' as const,
                text:
                  tradeResult.reason ??
                  npcInteractionText.noTradeLine(npcDefinition.name),
              },
            ]
          : [];
    const disclosureTurns = [
      ...disclosure.facts.map((fact) => ({
        speaker: 'system' as const,
        text: npcInteractionText.infoRevealLine(fact),
      })),
      ...disclosure.secrets.map((secret) => ({
        speaker: 'system' as const,
        text: npcInteractionText.secretRevealLine(secret),
      })),
    ];
    const questTurns = output.questOfferIds.map((questId) => ({
      speaker: 'system' as const,
      text: npcInteractionText.questIssuedLine(
        questTitlesById[questId] ?? questId,
      ),
    }));
    const networkTurns = output.relationshipNetworkChanges.map((change) => ({
      speaker: 'system' as const,
      text: npcInteractionText.networkChangeLine(
        this.store.getState().npcDefinitionsById[change.targetNpcId]?.name ??
          change.targetNpcId,
        change,
      ),
    }));
    const summaryTurns =
      (output.trustDelta ?? 0) !== 0 || (output.relationshipDelta ?? 0) !== 0
        ? [
            {
              speaker: 'system' as const,
              text: npcInteractionText.interactionSummaryLine(
                npcDefinition.name,
                output.trustDelta ?? 0,
                output.relationshipDelta ?? 0,
              ),
            },
          ]
        : [];

    const explanation = buildNpcInteractionExplanation({
      npcId,
      npcName: npcDefinition.name,
      beforeState: npcState,
      afterState: this.store.getState().npcStatesById[npcId],
      intent,
      questOfferIds: output.questOfferIds,
      disclosedFacts: disclosure.facts,
      disclosedSecrets: disclosure.secrets,
      relationshipNetworkChanges: output.relationshipNetworkChanges,
      itemTransfers: output.itemTransfers,
      playerGoldDelta: output.playerGoldDelta,
      decisionBasis: output.decisionBasis,
      explanationHint: output.explanationHint,
    });

    const explanationTurns = [
      ...(explanation.trust.reasons.length > 0
        ? [
            {
              speaker: 'system' as const,
              text: npcInteractionText.changeReasonLine(
                '信任',
                explanation.trust.reasons,
              ),
            },
          ]
        : []),
      ...(explanation.relationship.reasons.length > 0
        ? [
            {
              speaker: 'system' as const,
              text: npcInteractionText.changeReasonLine(
                '关系',
                explanation.relationship.reasons,
              ),
            },
          ]
        : []),
    ];

    const session = npcDialogueSessionSchema.parse({
      npcId,
      npcName: npcDefinition.name,
      history: [
        ...recentDialogue,
        {
          speaker: 'npc',
          text: output.npcReply,
        },
        ...disclosureTurns,
        ...questTurns,
        ...tradeTurns,
        ...networkTurns,
        ...summaryTurns,
        ...explanationTurns,
      ],
      state: this.store.getState().npcStatesById[npcId],
      explanation,
    });

    this.dialogueSessionsByNpcId.set(npcId, session);

    this.logger?.recordNpcInteractionDetail({
      npcId,
      createdAt,
      reply: output.npcReply,
      dialogue: session.history,
      trustDelta: output.trustDelta ?? 0,
      relationshipDelta: output.relationshipDelta ?? 0,
      unlockedQuestIds: output.questOfferIds,
      explanation,
    });

    this.eventBus?.emit('NPC_INTERACTED', {
      npcId,
      trustDelta: output.trustDelta ?? 0,
      relationshipDelta: output.relationshipDelta ?? 0,
      disposition: this.store.getState().npcStatesById[npcId].currentDisposition,
      unlockedQuestIds: output.questOfferIds,
    });

    if (
      this.reviewController &&
      isMajorNpcInteraction({
        trustDelta: output.trustDelta ?? 0,
        relationshipDelta: output.relationshipDelta ?? 0,
        explanationReasons: uniqueReasonEntries(explanation),
        disclosedInfoCount: explanation.disclosedInfo.length,
        unlockedQuestCount: output.questOfferIds.length,
      })
    ) {
      await this.reviewController.generateReview({
        request: {
          trigger: 'npc-interaction',
          npcInteraction: {
            npcId,
            npcName: npcDefinition.name,
            explanation,
            unlockedQuestIds: output.questOfferIds,
            isMajor: true,
          },
        },
        autoOpenPanel: false,
        autoSave: false,
      });
    }

    await maybeAutoSave(
      this.store,
      this.saveController,
      'auto',
      'npc-interaction',
    );

    return {
      ...session,
      npcReply: output.npcReply,
    };
  }

  getDialogueState(npcId: string) {
    return this.dialogueSessionsByNpcId.get(npcId) ?? null;
  }

  async endDialogue(npcId: string) {
    this.dialogueSessionsByNpcId.delete(npcId);
    const state = this.store.getState();
    state.setActivePanel('map');
    state.setSelectedNpcId(null);
  }
}

const uniqueReasonEntries = (explanation: NonNullable<NpcDialogueSession['explanation']>) =>
  Array.from(
    new Set([
      ...explanation.trust.reasons,
      ...explanation.relationship.reasons,
      ...explanation.decisionBasis,
    ]),
  );
