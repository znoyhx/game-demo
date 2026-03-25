import { describe, expect, it } from 'vitest';

import { mockBossEncounterDefinition, mockPlayerState } from '../../src/core/mocks';
import {
  applyDebugCombatPhase,
  evaluateCombatActionLegality,
  resolveCombatRound,
  resolveSimulatedCombatAction,
} from '../../src/core/rules';
import type {
  CombatEncounterDefinition,
  CombatEnvironmentState,
  CombatState,
  PlayerState,
} from '../../src/core/schemas';

const buildCombatState = (
  overrides: Partial<CombatState> = {},
): CombatState => ({
  encounterId: mockBossEncounterDefinition.id,
  turn: 2,
  currentPhaseId: 'phase:sealed-guard',
  activeTactic: 'defensive',
  player: {
    id: 'combatant:player',
    name: '玩家',
    hp: 24,
    maxHp: 30,
    statusEffects: [],
  },
  enemy: {
    id: 'combatant:ash-warden',
    name: '灰烬守卫',
    hp: 34,
    maxHp: 90,
    statusEffects: [],
  },
  logs: [],
  ...overrides,
});

const buildPlayerState = (
  overrides: Partial<PlayerState> = {},
): PlayerState => ({
  ...mockPlayerState,
  hp: 24,
  maxHp: 30,
  energy: 8,
  ...overrides,
});

const volatileSanctum: CombatEnvironmentState = {
  areaId: mockBossEncounterDefinition.areaId,
  label: '余烬风暴',
  hazard: 'volatile',
  weather: '余烬雨',
  lighting: '裂隙红光',
};

describe('combat rules', () => {
  it('rejects unsupported combat actions', () => {
    const result = evaluateCombatActionLegality(
      buildCombatState(),
      'dance',
      buildPlayerState(),
    );

    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain('不支持');
  });

  it('rejects resource-heavy commands when tracked energy is insufficient', () => {
    const result = evaluateCombatActionLegality(
      buildCombatState(),
      'special',
      buildPlayerState({ energy: 2 }),
    );

    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain('能量不足');
  });

  it('switches boss phase when hp thresholds are crossed', () => {
    const result = resolveCombatRound({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState(),
      playerState: buildPlayerState(),
      playerActionType: 'attack',
      enemyTactic: 'aggressive',
      commonPlayerActions: ['attack', 'attack', 'special'],
      environmentState: volatileSanctum,
    });

    expect(result.ok).toBe(true);
    expect(result.phase.changed).toBe(true);
    expect(result.phase.nextPhaseId).toBe('phase:embers-unbound');
  });

  it('applies resource lock to player energy and state', () => {
    const result = resolveCombatRound({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState({
        turn: 4,
      }),
      playerState: buildPlayerState({ energy: 7 }),
      playerActionType: 'special',
      enemyTactic: 'resource-lock',
      commonPlayerActions: ['special', 'heal', 'special'],
      environmentState: {
        ...volatileSanctum,
        hazard: 'tense',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.playerState.energy).toBe(1);
    expect(result.energyDelta).toBe(-6);
    expect(result.combatState.player.statusEffects).toContain('exhausted');
    expect(
      result.combatState.logs[result.combatState.logs.length - 1]?.actions.some((action) =>
        action.description.includes('能量'),
      ),
    ).toBe(true);
  });

  it('punishes repeated direct attacks with counter tactics', () => {
    const result = resolveCombatRound({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState({
        turn: 5,
      }),
      playerState: buildPlayerState({ hp: 22 }),
      playerActionType: 'attack',
      enemyTactic: 'counter',
      commonPlayerActions: ['attack', 'attack', 'special'],
      environmentState: {
        ...volatileSanctum,
        hazard: 'stable',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.playerDamageTaken).toBeGreaterThan(8);
    expect(result.combatState.activeTactic).toBe('counter');
  });

  it('supports semi-realtime command encounters with extra tempo pressure', () => {
    const semiRealtimeEncounter: CombatEncounterDefinition = {
      ...mockBossEncounterDefinition,
      id: 'encounter:tempo-test',
      mode: 'semi-realtime',
    };

    const result = resolveCombatRound({
      encounter: semiRealtimeEncounter,
      combatState: buildCombatState({
        encounterId: semiRealtimeEncounter.id,
        turn: 4,
      }),
      playerState: buildPlayerState({ energy: 5 }),
      playerActionType: 'analyze',
      enemyTactic: 'summon',
      commonPlayerActions: ['guard', 'analyze', 'heal'],
      environmentState: volatileSanctum,
    });

    expect(result.ok).toBe(true);
    expect(result.playerState.energy).toBe(3);
    expect(result.playerDamageTaken).toBeGreaterThanOrEqual(7);
    expect(result.combatState.enemy.statusEffects).toContain('reinforced');
  });

  it('marks victories and propagates updated outcome state', () => {
    const result = resolveCombatRound({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState({
        enemy: {
          id: 'combatant:ash-warden',
          name: '灰烬守卫',
          hp: 10,
          maxHp: 90,
          statusEffects: [],
        },
      }),
      playerState: buildPlayerState(),
      playerActionType: 'special',
      enemyTactic: 'aggressive',
      commonPlayerActions: ['special', 'attack'],
      environmentState: volatileSanctum,
    });

    expect(result.ok).toBe(true);
    expect(result.result).toBe('victory');
    expect(result.combatState.result).toBe('victory');
    expect(result.playerState.hp).toBeGreaterThan(0);
  });

  it('applies a forced boss phase through pure rules and syncs phase-biased tactic', () => {
    const result = applyDebugCombatPhase({
      encounter: mockBossEncounterDefinition,
      combatState: buildCombatState(),
      forcedPhaseId: 'phase:embers-unbound',
      addLog: true,
    });

    expect(result.ok).toBe(true);
    expect(result.phaseId).toBe('phase:embers-unbound');
    expect(result.selectedTactic).toBe('aggressive');
    expect(result.combatState.currentPhaseId).toBe('phase:embers-unbound');
    expect(
      result.combatState.logs[result.combatState.logs.length - 1]?.actions[0]
        ?.actionType,
    ).toBe('debug-phase-force');
  });

  it('selects deterministic simulated actions from the same seed and pattern', () => {
    const first = resolveSimulatedCombatAction({
      combatState: buildCombatState({
        turn: 1,
      }),
      playerState: buildPlayerState({ energy: 7 }),
      pattern: 'analysis-first',
      seed: 23,
    });
    const second = resolveSimulatedCombatAction({
      combatState: buildCombatState({
        turn: 1,
      }),
      playerState: buildPlayerState({ energy: 7 }),
      pattern: 'analysis-first',
      seed: 23,
    });

    expect(first.selectedAction).toBe('analyze');
    expect(first.selectedAction).toBe(second.selectedAction);
    expect(first.candidates).toEqual(second.candidates);
  });
});
