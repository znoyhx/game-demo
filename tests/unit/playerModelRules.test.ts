import { describe, expect, it } from 'vitest';

import {
  buildPlayerGuidanceHints,
  buildPlayerSystemReactionPreview,
  createPlayerModelPreviewState,
  evaluatePlayerModel,
  resolveEnemyCounterStrategyBias,
  resolveNpcReactionBias,
  resolvePlayerDifficultyAdjustment,
} from '../../src/core/rules';
import { mockBossCombatState, mockCombatHistory } from '../../src/core/mocks/mvp';
import { createEmptyPlayerModelSignalWeights } from '../../src/core/schemas';

describe('playerModelRules', () => {
  it('infers multi-dimensional player tags from exploration, combat, social and quest signals', () => {
    const result = evaluatePlayerModel({
      recentAreaVisits: ['area:a', 'area:b', 'area:c'],
      recentCombatActions: ['attack', 'special', 'guard'],
      recentNpcInteractionIntents: ['ask', 'trade', 'quest'],
      recentQuestChoices: ['branch:trust-ally', 'branch:fast-direct-route'],
      combatSummary: mockBossCombatState,
      combatHistory: mockCombatHistory,
      npcInteractionCount: 4,
      activeQuestCount: 2,
      completedQuestCount: 1,
      signalWeights: {
        ...createEmptyPlayerModelSignalWeights(),
        exploration: 3,
        combat: 2,
        social: 2,
        story: 3,
        speedrun: 1,
        cautious: 1,
        risky: 2,
      },
    });

    expect(result.tags).toContain('exploration');
    expect(result.tags).toContain('combat');
    expect(result.tags).toContain('story');
    expect(result.rationale?.length ?? 0).toBeGreaterThan(0);
    expect(result.riskForecast).toBeTruthy();
    expect(result.stuckPoint).toBeTruthy();
  });

  it('builds downstream usage hints and tactical biases from player tags', () => {
    const hints = buildPlayerGuidanceHints({
      tags: ['combat', 'risky', 'speedrun'],
      dominantStyle: 'combat',
      rationale: ['你近期更偏主动压制。'],
      riskForecast: '继续压制会更容易被反制。',
      stuckPoint: '若速推卡住，先补关键 NPC 线索。',
    });
    const difficulty = resolvePlayerDifficultyAdjustment(
      {
        tags: ['combat', 'risky'],
      },
      'normal',
    );
    const npcBias = resolveNpcReactionBias(
      {
        tags: ['social', 'cautious'],
      },
      'trade',
    );
    const enemyBias = resolveEnemyCounterStrategyBias(['combat', 'risky']);

    expect(hints.some((hint) => hint.id === 'guidance:combat')).toBe(true);
    expect(difficulty.enemyHpMultiplier).toBeGreaterThan(1);
    expect(npcBias.trustDelta).toBeGreaterThan(0);
    expect(enemyBias.tacticPriorities).toContain('counter');
  });

  it('shows different system reactions under different injected profiles', () => {
    const aggressivePreview = buildPlayerSystemReactionPreview({
      playerModel: createPlayerModelPreviewState({
        tags: ['combat', 'risky', 'speedrun'],
      }),
      difficulty: 'normal',
      npcIntent: 'quest',
    });
    const socialPreview = buildPlayerSystemReactionPreview({
      playerModel: createPlayerModelPreviewState({
        tags: ['social', 'story', 'cautious'],
      }),
      difficulty: 'normal',
      npcIntent: 'quest',
    });

    expect(aggressivePreview.difficulty.enemyHpMultiplier).toBeGreaterThan(
      socialPreview.difficulty.enemyHpMultiplier,
    );
    expect(aggressivePreview.enemyStrategy.tacticPriorities).toContain('counter');
    expect(
      aggressivePreview.hints.some((hint) => hint.id === 'guidance:combat'),
    ).toBe(true);
    expect(socialPreview.npcReaction.trustDelta).toBeGreaterThan(
      aggressivePreview.npcReaction.trustDelta,
    );
    expect(socialPreview.hints.some((hint) => hint.id === 'guidance:npc')).toBe(true);
  });
});
