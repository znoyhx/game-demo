import type {
  CombatEncounterDefinition,
  CombatHistoryEntry,
  CombatState,
  ReviewPayload,
  ReviewState,
} from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockBossEncounterDefinition: CombatEncounterDefinition = {
  id: mockIds.encounter,
  title: '圣所的灰烬守卫',
  mode: 'turn-based',
  areaId: mockIds.areas.sanctum,
  enemyNpcId: mockIds.npcs.ashWarden,
  tacticPool: ['aggressive', 'defensive', 'counter'],
  bossPhases: [
    {
      id: 'phase:sealed-guard',
      label: '封印守势',
      thresholdType: 'hp',
      thresholdValue: 70,
      tacticBias: ['defensive', 'counter'],
    },
    {
      id: 'phase:embers-unbound',
      label: '余烬失控',
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
    name: '玩家',
    hp: 14,
    maxHp: 30,
    statusEffects: ['guarded'],
  },
  enemy: {
    id: 'combatant:ash-warden',
    name: '灰烬守卫',
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
          description: '灰烬守卫举起了一面余烬玻璃护盾。',
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
          description: '灰烬守卫手持燃烧长枪横跨战场猛扑而来。',
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
          description: '圣所封印出现裂痕，第二阶段开始。',
        },
        {
          actor: 'enemy',
          actionType: 'cinder-counter',
          description: '灰烬守卫用余烬反击惩罚了正面硬拼。',
          value: 7,
        },
      ],
    },
  ],
  result: 'victory',
};

export const mockCombatHistory: CombatHistoryEntry[] = [
  {
    encounterId: mockBossEncounterDefinition.id,
    result: 'victory',
    finalTactic: 'counter',
    resolvedAt: mockTimeline.combatResolvedAt,
  },
];

export const mockReviewPayload: ReviewPayload = {
  generatedAt: mockTimeline.reviewGeneratedAt,
  encounterId: mockBossEncounterDefinition.id,
  playerTags: ['exploration', 'story', 'risky'],
  keyEvents: [
    '莱拉在第一次守护简报后打开了通往秘库的路线。',
    '灰烬守卫在血量较低时切换到了“余烬失控”阶段。',
    '连续正面强攻触发了敌人的反击战术。',
  ],
  explanations: [
    {
      type: 'combat',
      title: '已切换到反击姿态',
      summary: '首领识别到玩家持续进行正面压制，因此切换为反应式反击模式。',
      evidence: [
        '第 3 回合时激活战术切换为了“反击”。',
        '玩家画像中包含“高风险”标签。',
      ],
    },
    {
      type: 'quest',
      title: '圣所路线已解锁',
      summary: '秘库推进进度与守护知识结合后，暴露出了通往圣所的路线。',
      evidence: ['主线任务通过秘库目标继续推进。'],
    },
  ],
  suggestions: [
    '用防御回合和高伤爆发交替出手，打断首领的反击循环。',
  ],
};

export const mockReviewState: ReviewState = {
  current: mockReviewPayload,
  history: [mockReviewPayload],
};
