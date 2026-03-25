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
        label: '圣所回廊',
        hazard: 'tense',
        weather: '余烬风',
      },
      bossPhaseId: 'phase:embers-unbound',
    });

    expect(result.selectedTactic).toBe('counter');
    expect(result.reason).toContain('正面强压');
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
        label: '圣所风暴前室',
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
        label: '余烬裂隙',
        hazard: 'volatile',
        weather: '火星雨',
      },
      bossPhaseId: 'phase:sealed-guard',
    });

    expect(result.selectedTactic).toBe('trap');
    expect(result.reason).toContain('陷阱');
  });
});
