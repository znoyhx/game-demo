import { describe, expect, it } from 'vitest';

import { createMockAgentSet } from '../../src/core/agents';
import {
  mockBossCombatState,
  mockBossEncounterDefinition,
  mockPlayerModelState,
  mockPlayerState,
} from '../../src/core/mocks/mvp';

describe('MockEnemyTacticianAgent', () => {
  it('chooses counter tactics against repeated direct pressure', async () => {
    const agent = createMockAgentSet().enemyTactician;

    const result = await agent.run({
      encounter: mockBossEncounterDefinition,
      combatState: {
        ...mockBossCombatState,
        result: undefined,
      },
      playerState: {
        ...mockPlayerState,
        hp: 22,
        energy: 7,
      },
      playerTags: ['combat', 'risky'],
      commonPlayerActions: ['attack', 'special', 'attack'],
      environmentState: {
        areaId: mockBossEncounterDefinition.areaId,
        label: '灰烬圣所',
        hazard: 'tense',
        weather: '余烬风暴',
      },
      bossPhaseId: 'phase:embers-unbound',
    });

    expect(result.selectedTactic).toBe('counter');
    expect(result.reason).toContain('反制');
  });

  it('uses resource lock when the player depends on scarce energy', async () => {
    const agent = createMockAgentSet().enemyTactician;

    const result = await agent.run({
      encounter: mockBossEncounterDefinition,
      combatState: {
        ...mockBossCombatState,
        result: undefined,
      },
      playerState: {
        ...mockPlayerState,
        hp: 18,
        energy: 2,
      },
      playerTags: mockPlayerModelState.tags,
      commonPlayerActions: ['special', 'heal', 'special'],
      environmentState: {
        areaId: mockBossEncounterDefinition.areaId,
        label: '封印回廊',
        hazard: 'stable',
      },
      bossPhaseId: 'phase:sealed-guard',
    });

    expect(result.selectedTactic).toBe('resource-lock');
    expect(result.reason).toContain('资源');
  });

  it('leans into trap play in volatile environments', async () => {
    const agent = createMockAgentSet().enemyTactician;

    const result = await agent.run({
      encounter: mockBossEncounterDefinition,
      combatState: {
        ...mockBossCombatState,
        result: undefined,
      },
      playerState: {
        ...mockPlayerState,
        hp: 24,
        energy: 6,
      },
      playerTags: ['story', 'cautious'],
      commonPlayerActions: ['guard', 'heal', 'analyze'],
      environmentState: {
        areaId: mockBossEncounterDefinition.areaId,
        label: '裂隙边缘',
        hazard: 'volatile',
        weather: '灰烬落雨',
      },
      bossPhaseId: 'phase:sealed-guard',
    });

    expect(result.selectedTactic).toBe('trap');
    expect(result.reason).toContain('陷阱');
  });
});
