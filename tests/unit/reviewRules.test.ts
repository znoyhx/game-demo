import { describe, expect, it } from 'vitest';

import {
  buildCombatHistoryEntry,
  buildCombatReviewSummary,
  buildNpcInteractionExplanation,
  buildReviewPayload,
  summarizeCombatPhaseChanges,
  summarizeCombatTacticChanges,
} from '../../src/core/rules';
import {
  mockBossCombatState,
  mockBossEncounterDefinition,
  mockEventHistory,
  mockIds,
  mockNpcStates,
  mockPlayerModelState,
  mockPlayerState,
  mockQuestProgress,
  mockTimeline,
} from '../../src/core/mocks/mvp';

describe('reviewRules', () => {
  it('extracts visible tactic and phase changes from boss combat logs', () => {
    const tacticChanges = summarizeCombatTacticChanges(
      mockBossCombatState,
      mockBossEncounterDefinition,
    );
    const phaseChanges = summarizeCombatPhaseChanges(
      mockBossCombatState,
      mockBossEncounterDefinition,
    );

    expect(tacticChanges).toHaveLength(3);
    expect(tacticChanges.map((change) => change.toTactic)).toEqual([
      'trap',
      'summon',
      'counter',
    ]);
    expect(phaseChanges).toHaveLength(1);
    expect(phaseChanges[0]?.toPhaseId).toBe('phase:embers-unbound');
  });

  it('builds a persisted combat history summary for save/reload flows', () => {
    const summary = buildCombatHistoryEntry({
      encounter: mockBossEncounterDefinition,
      combatState: mockBossCombatState,
      resolvedAt: mockTimeline.combatResolvedAt,
    });

    expect(summary.turnCount).toBe(4);
    expect(summary.finalTactic).toBe('counter');
    expect(summary.phaseChanges).toHaveLength(1);
    expect(summary.keyPlayerBehaviors[0]?.actionType).toBe('attack');
  });

  it('generates a structured combat review payload with tactic reasons and knowledge summary', () => {
    const combatSummary = buildCombatReviewSummary({
      encounter: mockBossEncounterDefinition,
      combatState: mockBossCombatState,
    });
    const review = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'combat',
      },
      reviewHistory: [],
      encounter: mockBossEncounterDefinition,
      combat: mockBossCombatState,
      combatHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });

    expect(combatSummary?.result.totalTurns).toBe(4);
    expect(combatSummary?.tacticChanges).toHaveLength(3);
    expect(review.trigger).toBe('combat');
    expect(review.combatSummary?.result.result).toBe('victory');
    expect(review.enemyTacticReasons).toHaveLength(3);
    expect(review.outcomeFactors.length).toBeGreaterThan(0);
    expect(review.nextStepSuggestions.length).toBeGreaterThan(0);
    expect(review.knowledgeSummary?.extensionKey).toBe('education-mode');
    expect(review.explanations.some((item) => item.type === 'playerModel')).toBe(true);
  });

  it('generates quest-branch explanations with explicit reasons', () => {
    const review = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
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
          summary: '任务“重燃守护火线”已切换到“争取罗文的巡逻支援”分支。',
          reasons: ['满足条件：完成前哨引导', '满足条件：当前主线已进入进行中'],
        },
      },
      reviewHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });

    expect(review.trigger).toBe('quest-branch');
    expect(review.questBranchReasons).toHaveLength(1);
    expect(review.questBranchReasons[0]?.branchLabel).toBe('争取罗文的巡逻支援');
    expect(review.outcomeFactors.some((factor) => factor.title.includes('任务分支'))).toBe(
      true,
    );
    expect(review.nextStepSuggestions[0]).toContain('争取罗文的巡逻支援');
  });

  it('generates npc-attitude explanations for major interactions', () => {
    const beforeState = mockNpcStates.find((entry) => entry.npcId === mockIds.npcs.lyra)!;
    const afterState = {
      ...beforeState,
      trust: beforeState.trust + 4,
      relationship: beforeState.relationship + 5,
      currentDisposition: 'friendly' as const,
      emotionalState: 'grateful' as const,
    };
    const explanation = buildNpcInteractionExplanation({
      npcId: mockIds.npcs.lyra,
      npcName: '莱拉',
      beforeState,
      afterState,
      intent: 'quest',
      questOfferIds: [mockIds.quests.main],
      disclosedFacts: ['莱拉公开了一条关于秘库的情报。'],
      disclosedSecrets: [],
      relationshipNetworkChanges: [],
      itemTransfers: [],
      playerGoldDelta: 0,
      decisionBasis: ['玩家带回了关键线索', '当前交互意图是任务'],
      explanationHint: '莱拉判断玩家值得托付主线任务。',
    });
    const review = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'npc-interaction',
        npcInteraction: {
          npcId: mockIds.npcs.lyra,
          npcName: '莱拉',
          explanation,
          unlockedQuestIds: [mockIds.quests.main],
          isMajor: true,
        },
      },
      reviewHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });

    expect(review.trigger).toBe('npc-interaction');
    expect(review.npcAttitudeReasons).toHaveLength(1);
    expect(review.npcAttitudeReasons[0]?.npcName).toBe('莱拉');
    expect(review.npcAttitudeReasons[0]?.summary).toContain('当前态度');
    expect(review.outcomeFactors.some((factor) => factor.title.includes('角色态度'))).toBe(
      true,
    );
  });

  it('rolls prior quest and npc explanations into a run-failed review', () => {
    const previousQuestReview = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
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
          summary: '任务“重燃守护火线”已切换到“争取罗文的巡逻支援”分支。',
          reasons: ['满足条件：完成前哨引导'],
        },
      },
      reviewHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });
    const previousNpcReview = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'npc-interaction',
        npcInteraction: {
          npcId: mockIds.npcs.rowan,
          npcName: '罗文',
          explanation: {
            npcId: mockIds.npcs.rowan,
            npcName: '罗文',
            attitudeLabel: '戒备',
            emotionalStateLabel: '警觉',
            trust: {
              before: 22,
              after: 18,
              delta: -4,
              reasons: ['本轮交谈提高了对方的戒备'],
            },
            relationship: {
              before: 10,
              after: 8,
              delta: -2,
              reasons: ['这次互动削弱了协作意愿'],
            },
            decisionBasis: ['玩家在关键节点表现得过于冒险'],
            disclosedInfo: [],
            debugSummary: '当前态度 戒备；情绪 警觉',
          },
          unlockedQuestIds: [],
          isMajor: true,
        },
      },
      reviewHistory: [previousQuestReview],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });
    const failedQuestProgress = mockQuestProgress.map((progress) =>
      progress.questId === mockIds.quests.main
        ? { ...progress, status: 'failed' as const, updatedAt: mockTimeline.reviewGeneratedAt }
        : progress,
    );
    const runReview = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
      playerTags: mockPlayerState.profileTags,
      playerModel: mockPlayerModelState,
      difficulty: 'normal',
      reviewRequest: {
        trigger: 'run-failed',
        runOutcome: {
          result: 'failed',
          questId: mockIds.quests.main,
          questTitle: '重燃守护火线',
          summary: '主线在守护火线崩塌后被判定失败。',
          reasons: ['世界标记 wardlineCollapsed 已触发'],
        },
      },
      reviewHistory: [previousQuestReview, previousNpcReview],
      questProgress: failedQuestProgress,
      eventHistory: mockEventHistory,
    });

    expect(runReview.trigger).toBe('run-failed');
    expect(runReview.questBranchReasons.length).toBeGreaterThan(0);
    expect(runReview.npcAttitudeReasons.length).toBeGreaterThan(0);
    expect(runReview.outcomeFactors.some((factor) => factor.kind === 'failure')).toBe(true);
    expect(runReview.knowledgeSummary?.keyPoints.length).toBeGreaterThan(0);
  });
});
