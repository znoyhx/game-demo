import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import {
  DebugScenarioController,
  ReviewGenerationController,
} from '../../src/core/controllers';
import {
  mockIds,
  mockNpcStates,
  mockPlayerModelState,
  mockPlayerState,
  mockQuestProgress,
  mockSaveSnapshot,
} from '../../src/core/mocks/mvp';
import {
  buildExplainCoachInputFromSnapshot,
  buildNpcInteractionExplanation,
  buildReviewPayload,
} from '../../src/core/rules';
import { createGameStore } from '../../src/core/state';

describe('review reconstruction', () => {
  it('builds replay input from a saved combat history selection', () => {
    const snapshot = structuredClone(mockSaveSnapshot);

    snapshot.combatSystem = {
      ...snapshot.combatSystem!,
      history: [
        ...snapshot.combatSystem!.history,
        {
          ...snapshot.combatSystem!.history[0],
          resolvedAt: '2026-03-24T09:00:00.000Z',
          finalTactic: 'trap',
          turnCount: 5,
          playerRemainingHp: 8,
          enemyRemainingHp: 12,
        },
      ],
    };

    const input = buildExplainCoachInputFromSnapshot({
      snapshot,
      target: {
        trigger: 'combat',
        combatHistoryIndex: 0,
      },
    });

    expect(input.reviewRequest.trigger).toBe('combat');
    expect(input.combat).toBeNull();
    expect(input.combatHistory).toHaveLength(1);
    expect(input.combatHistory[0]?.finalTactic).toBe('counter');
  });

  it('reconstructs a combat review from saved combat history without an active run', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    const store = createGameStore();
    const controller = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
    });

    const review = await controller.reconstructReviewFromSnapshot({
      snapshot,
      target: {
        trigger: 'combat',
      },
      appendToHistory: false,
    });

    expect(review.trigger).toBe('combat');
    expect(review.combatSummary?.result.totalTurns).toBe(4);
    expect(review.enemyTacticReasons).toHaveLength(3);
    expect(review.outcomeFactors.length).toBeGreaterThan(0);
    expect(review.knowledgeSummary?.extensionKey).toBe('education-mode');
    expect(store.getState().reviewState.current?.trigger).toBe('combat');
    expect(store.getState().ui.activePanel).toBe('review');
  });

  it('reconstructs quest-branch reasons from a saved quest snapshot', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);

    snapshot.quests.progress = snapshot.quests.progress.map((progress) =>
      progress.questId === mockIds.quests.main
        ? {
            ...progress,
            chosenBranchId: 'branch:main-trust-rowan',
            updatedAt: '2026-03-24T03:00:00.000Z',
          }
        : progress,
    );
    snapshot.quests.history = [
      ...snapshot.quests.history,
      {
        questId: mockIds.quests.main,
        status: 'active',
        branchId: 'branch:main-trust-rowan',
        note: '主线已改为争取罗文巡逻支援的推进方案。',
        updatedAt: '2026-03-24T03:00:00.000Z',
      },
    ];
    snapshot.reviewState = {
      current: null,
      history: [],
    };

    const store = createGameStore();
    const controller = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
    });

    const review = await controller.reconstructReviewFromSnapshot({
      snapshot,
      target: {
        trigger: 'quest-branch',
        questId: mockIds.quests.main,
      },
      appendToHistory: false,
    });

    expect(review.trigger).toBe('quest-branch');
    expect(review.questBranchReasons[0]?.questId).toBe(mockIds.quests.main);
    expect(review.questBranchReasons[0]?.branchId).toBe('branch:main-trust-rowan');
    expect(review.questBranchReasons[0]?.reasons.length).toBeGreaterThan(0);
    expect(review.nextStepSuggestions.length).toBeGreaterThan(0);
  });

  it('reconstructs NPC attitude reasons from saved review breadcrumbs and NPC state', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    const beforeState = mockNpcStates.find((entry) => entry.npcId === mockIds.npcs.rowan)!;
    const afterState = {
      ...beforeState,
      trust: beforeState.trust + 5,
      relationship: beforeState.relationship + 3,
      currentDisposition: 'friendly' as const,
      emotionalState: 'grateful' as const,
      memory: {
        ...beforeState.memory,
        lastInteractionAt: '2026-03-24T03:00:00.000Z',
      },
    };

    snapshot.npcs.runtime = snapshot.npcs.runtime.map((entry) =>
      entry.npcId === mockIds.npcs.rowan ? afterState : entry,
    );

    const explanation = buildNpcInteractionExplanation({
      npcId: mockIds.npcs.rowan,
      npcName: '罗文队长',
      beforeState,
      afterState,
      intent: 'quest',
      questOfferIds: [mockIds.quests.sidePatrol],
      disclosedFacts: ['罗文确认会把南侧巡逻线交给玩家接手。'],
      disclosedSecrets: [],
      relationshipNetworkChanges: [],
      itemTransfers: [],
      playerGoldDelta: 0,
      decisionBasis: ['玩家在前线巡逻中表现稳定。'],
      explanationHint: '罗文开始把玩家视为可靠协防对象。',
    });
    const npcReview = buildReviewPayload({
      generatedAt: '2026-03-24T03:00:00.000Z',
      player: mockPlayerState,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'npc-interaction',
        npcInteraction: {
          npcId: mockIds.npcs.rowan,
          npcName: '罗文队长',
          explanation,
          unlockedQuestIds: [mockIds.quests.sidePatrol],
          isMajor: true,
        },
      },
      reviewHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: snapshot.events.history,
    });

    snapshot.reviewState = {
      current: null,
      history: [npcReview],
    };

    const store = createGameStore();
    const controller = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
    });

    const review = await controller.reconstructReviewFromSnapshot({
      snapshot,
      target: {
        trigger: 'npc-interaction',
        npcId: mockIds.npcs.rowan,
      },
      appendToHistory: false,
    });

    expect(review.trigger).toBe('npc-interaction');
    expect(review.npcAttitudeReasons[0]?.npcId).toBe(mockIds.npcs.rowan);
    expect(review.npcAttitudeReasons[0]?.reasons.length).toBeGreaterThan(0);
    expect(review.npcAttitudeReasons[0]?.decisionBasis.length).toBeGreaterThan(0);
  });

  it('reconstructs a run-failed review from saved quest, NPC, and event data', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    const questReview = buildReviewPayload({
      generatedAt: '2026-03-24T02:00:00.000Z',
      player: mockPlayerState,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'quest-branch',
        questBranch: {
          questId: mockIds.quests.main,
          questTitle: '重燃守护火线',
          branchId: 'branch:main-trust-rowan',
          branchLabel: '争取罗文的巡逻支援',
          status: 'active',
          summary: '主线已进入罗文巡逻支援分支。',
          reasons: ['玩家已完成前哨交接。'],
        },
      },
      reviewHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: snapshot.events.history,
    });
    const npcReview = buildReviewPayload({
      generatedAt: '2026-03-24T03:00:00.000Z',
      player: mockPlayerState,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'npc-interaction',
        npcInteraction: {
          npcId: mockIds.npcs.rowan,
          npcName: '罗文队长',
          explanation: buildNpcInteractionExplanation({
            npcId: mockIds.npcs.rowan,
            npcName: '罗文队长',
            beforeState: mockNpcStates.find((entry) => entry.npcId === mockIds.npcs.rowan)!,
            afterState: {
              ...mockNpcStates.find((entry) => entry.npcId === mockIds.npcs.rowan)!,
              trust: 12,
              relationship: 6,
              currentDisposition: 'suspicious',
              emotionalState: 'tense',
            },
            intent: 'persuade',
            questOfferIds: [],
            disclosedFacts: [],
            disclosedSecrets: [],
            relationshipNetworkChanges: [],
            itemTransfers: [],
            playerGoldDelta: 0,
            decisionBasis: ['玩家在关键节点上选择了冒险推进。'],
            explanationHint: '罗文对玩家的推进节奏保持戒备。',
          }),
          unlockedQuestIds: [],
          isMajor: true,
        },
      },
      reviewHistory: [questReview],
      questProgress: mockQuestProgress,
      eventHistory: snapshot.events.history,
    });

    snapshot.quests.progress = snapshot.quests.progress.map((progress) =>
      progress.questId === mockIds.quests.main
        ? {
            ...progress,
            status: 'failed',
            updatedAt: '2026-03-24T04:00:00.000Z',
          }
        : progress,
    );
    snapshot.quests.history = [
      ...snapshot.quests.history,
      {
        questId: mockIds.quests.main,
        status: 'failed',
        note: '主线因守护火线崩塌而失败。',
        updatedAt: '2026-03-24T04:00:00.000Z',
      },
    ];
    snapshot.reviewState = {
      current: null,
      history: [questReview, npcReview],
    };

    const store = createGameStore();
    const controller = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
    });

    const review = await controller.reconstructReviewFromSnapshot({
      snapshot,
      target: {
        trigger: 'run-failed',
      },
      appendToHistory: false,
    });

    expect(review.trigger).toBe('run-failed');
    expect(review.questBranchReasons.length).toBeGreaterThan(0);
    expect(review.npcAttitudeReasons.length).toBeGreaterThan(0);
    expect(review.outcomeFactors.some((factor) => factor.kind === 'failure')).toBe(true);
    expect(review.nextStepSuggestions.length).toBeGreaterThan(0);
  });

  it('supports standalone debug replay without a full playthrough', async () => {
    const snapshot = structuredClone(mockSaveSnapshot);
    const store = createGameStore();
    const reviewController = new ReviewGenerationController({
      store,
      agents: createMockAgentSet(),
    });
    const debugController = new DebugScenarioController({
      store,
      reviewController,
    });

    const review = await debugController.reconstructReviewFromScenario(snapshot, {
      trigger: 'combat',
    });

    expect(review?.trigger).toBe('combat');
    expect(store.getState().reviewState.current?.trigger).toBe('combat');
    expect(store.getState().ui.activePanel).toBe('review');
    expect(store.getState().debugTools.logsPanelOpen).toBe(true);
  });
});
