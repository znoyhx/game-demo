import { describe, expect, it } from 'vitest';

import { mockBossEncounterDefinition } from '../../src/core/mocks';
import { evaluateCombatActionLegality, resolveCombatRound } from '../../src/core/rules';
import type { CombatState } from '../../src/core/schemas';

const buildCombatState = (): CombatState => ({
  encounterId: mockBossEncounterDefinition.id,
  turn: 2,
  currentPhaseId: 'phase:sealed-guard',
  activeTactic: 'defensive',
  player: {
    id: 'combatant:player',
    name: 'Player',
    hp: 24,
    maxHp: 30,
  },
  enemy: {
    id: 'combatant:ash-warden',
    name: 'Ash Warden',
    hp: 34,
    maxHp: 90,
  },
  logs: [],
});

describe('combat rules', () => {
  it('rejects unsupported combat actions', () => {
    const result = evaluateCombatActionLegality(buildCombatState(), 'dance');

    expect(result.ok).toBe(false);
  });

  it('switches boss phase when hp thresholds are crossed', () => {
    const result = resolveCombatRound({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState(),
      playerActionType: 'attack',
      enemyTactic: 'aggressive',
    });

    expect(result.ok).toBe(true);
    expect(result.phase.changed).toBe(true);
    expect(result.phase.nextPhaseId).toBe('phase:embers-unbound');
  });
});
