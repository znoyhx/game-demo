import type { CombatEncounterDefinition, CombatState, ReviewPayload } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockBossEncounterDefinition: CombatEncounterDefinition = {
  id: mockIds.encounter,
  title: 'Ashen Warden of the Sanctum',
  mode: 'turn-based',
  areaId: mockIds.areas.sanctum,
  enemyNpcId: mockIds.npcs.ashWarden,
  tacticPool: ['aggressive', 'defensive', 'counter'],
  bossPhases: [
    {
      id: 'phase:sealed-guard',
      label: 'Sealed Guard',
      thresholdType: 'hp',
      thresholdValue: 70,
      tacticBias: ['defensive', 'counter'],
    },
    {
      id: 'phase:embers-unbound',
      label: 'Embers Unbound',
      thresholdType: 'hp',
      thresholdValue: 35,
      tacticBias: ['aggressive', 'counter'],
    },
  ],
};

export const mockBossCombatState: CombatState = {
  encounterId: mockBossEncounterDefinition.id,
  turn: 4,
  currentPhaseId: 'phase:embers-unbound',
  activeTactic: 'counter',
  player: {
    id: 'combatant:player',
    name: 'Player',
    hp: 14,
    maxHp: 30,
    statusEffects: ['guarded'],
  },
  enemy: {
    id: 'combatant:ash-warden',
    name: 'Ash Warden',
    hp: 21,
    maxHp: 90,
    statusEffects: ['staggered'],
  },
  logs: [
    {
      turn: 1,
      phaseId: 'phase:sealed-guard',
      activeTactic: 'defensive',
      actions: [
        {
          actor: 'enemy',
          actionType: 'ward-shield',
          description: 'The Ash Warden raises a shield of ember glass.',
          value: 6,
        },
      ],
    },
    {
      turn: 2,
      phaseId: 'phase:sealed-guard',
      activeTactic: 'aggressive',
      actions: [
        {
          actor: 'enemy',
          actionType: 'ember-lunge',
          description: 'The Ash Warden lunges across the arena with a burning spear.',
          value: 9,
        },
      ],
    },
    {
      turn: 3,
      phaseId: 'phase:embers-unbound',
      activeTactic: 'counter',
      actions: [
        {
          actor: 'system',
          actionType: 'phase-shift',
          description: 'The sanctum seal cracks and the second phase begins.',
        },
        {
          actor: 'enemy',
          actionType: 'cinder-counter',
          description: 'The Ash Warden punishes a direct strike with a cinder counter.',
          value: 7,
        },
      ],
    },
  ],
  result: 'victory',
};

export const mockReviewPayload: ReviewPayload = {
  generatedAt: mockTimeline.reviewGeneratedAt,
  encounterId: mockBossEncounterDefinition.id,
  playerTags: ['exploration', 'story', 'risky'],
  keyEvents: [
    'Lyra opened the archive route after the first ward briefing.',
    'The Ash Warden shifted into Embers Unbound at low health.',
    'A counter tactic punished repeated direct attacks.',
  ],
  explanations: [
    {
      type: 'combat',
      title: 'Counter stance selected',
      summary: 'The boss detected repeated direct pressure and switched to a reactive counter pattern.',
      evidence: [
        'Turn 3 changed the active tactic to counter.',
        'The player profile includes risky.',
      ],
    },
    {
      type: 'quest',
      title: 'Sanctum route became available',
      summary: 'Archive progress and ward knowledge combined to expose the sanctum approach.',
      evidence: ['Main quest advanced through the archive objective.'],
    },
  ],
  suggestions: [
    'Break the boss counter loop by alternating guarded turns with high-damage bursts.',
  ],
};
