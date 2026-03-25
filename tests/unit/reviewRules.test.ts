import { describe, expect, it } from 'vitest';

import {
  buildCombatHistoryEntry,
  buildCombatReviewSummary,
  buildReviewPayload,
  summarizeCombatPhaseChanges,
  summarizeCombatTacticChanges,
} from '../../src/core/rules';
import {
  mockBossCombatState,
  mockBossEncounterDefinition,
  mockEventHistory,
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

  it('generates a structured combat review payload with result summary and suggestions', () => {
    const combatSummary = buildCombatReviewSummary({
      encounter: mockBossEncounterDefinition,
      combatState: mockBossCombatState,
    });
    const review = buildReviewPayload({
      generatedAt: mockTimeline.reviewGeneratedAt,
      playerTags: ['exploration', 'story', 'risky'],
      encounter: mockBossEncounterDefinition,
      combat: mockBossCombatState,
      combatHistory: [],
      questProgress: mockQuestProgress,
      eventHistory: mockEventHistory,
    });

    expect(combatSummary?.result.totalTurns).toBe(4);
    expect(combatSummary?.tacticChanges).toHaveLength(3);
    expect(review.combatSummary?.result.result).toBe('victory');
    expect(review.combatSummary?.keyPlayerBehaviors[0]?.actionType).toBe('attack');
    expect(review.explanations.some((item) => item.title.includes('战术切换'))).toBe(
      true,
    );
    expect(review.suggestions.length).toBeGreaterThan(0);
  });
});
