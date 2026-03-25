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
  tacticPool: [
    'aggressive',
    'defensive',
    'counter',
    'trap',
    'summon',
    'resource-lock',
  ],
  bossPhases: [
    {
      id: 'phase:sealed-guard',
      label: '封印守势',
      thresholdType: 'hp',
      thresholdValue: 70,
      tacticBias: ['defensive', 'resource-lock', 'trap'],
    },
    {
      id: 'phase:embers-unbound',
      label: '余烬失控',
      thresholdType: 'hp',
      thresholdValue: 35,
      tacticBias: ['aggressive', 'counter', 'summon'],
    },
  ],
};

export const mockBossCombatState: CombatState = {
  encounterId: mockBossEncounterDefinition.id,
  turn: 5,
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
          actor: 'player',
          actionType: 'attack',
          description: '玩家先手试探性攻击，观察首领的护盾反应。',
          value: 12,
        },
        {
          actor: 'enemy',
          actionType: 'ward-shield',
          description: '灰烬守卫抬起封印护盾，开始用防守消耗拖慢节奏。',
          value: 6,
        },
      ],
    },
    {
      turn: 2,
      phaseId: 'phase:sealed-guard',
      activeTactic: 'trap',
      actions: [
        {
          actor: 'player',
          actionType: 'heal',
          description: '玩家选择治疗，试图稳住血线。',
          value: 9,
        },
        {
          actor: 'enemy',
          actionType: 'ember-snare',
          description: '灰烬守卫在脚下布置余烬陷阱，诱导玩家在原地恢复。',
          value: 7,
        },
      ],
    },
    {
      turn: 3,
      phaseId: 'phase:embers-unbound',
      activeTactic: 'summon',
      actions: [
        {
          actor: 'player',
          actionType: 'attack',
          description: '玩家再次正面进攻，逼近阶段切换阈值。',
          value: 13,
        },
        {
          actor: 'system',
          actionType: 'phase-shift',
          description: '圣所封印出现裂痕，首领进入“余烬失控”阶段。',
        },
        {
          actor: 'enemy',
          actionType: 'summon-support',
          description: '灰烬守卫召来余烬傀儡，用支援单位压缩站位。',
          value: 6,
        },
      ],
    },
    {
      turn: 4,
      phaseId: 'phase:embers-unbound',
      activeTactic: 'counter',
      actions: [
        {
          actor: 'player',
          actionType: 'special',
          description: '玩家交出特技想要强行斩杀首领。',
          value: 18,
        },
        {
          actor: 'enemy',
          actionType: 'cinder-counter',
          description: '灰烬守卫读取到爆发意图，立刻以反制姿态回敬。',
          value: 8,
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
    turnCount: 4,
    finalPhaseId: 'phase:embers-unbound',
    tacticChanges: [
      {
        turn: 2,
        fromTactic: 'defensive',
        toTactic: 'trap',
        phaseId: 'phase:sealed-guard',
        summary: '第 2 回合切换为“诱导陷阱”，当前阶段为“封印守势”。',
      },
      {
        turn: 3,
        fromTactic: 'trap',
        toTactic: 'summon',
        phaseId: 'phase:embers-unbound',
        summary: '第 3 回合切换为“召唤支援”，当前阶段为“余烬失控”。',
      },
      {
        turn: 4,
        fromTactic: 'summon',
        toTactic: 'counter',
        phaseId: 'phase:embers-unbound',
        summary: '第 4 回合切换为“套路反制”，当前阶段为“余烬失控”。',
      },
    ],
    phaseChanges: [
      {
        turn: 3,
        fromPhaseId: 'phase:sealed-guard',
        toPhaseId: 'phase:embers-unbound',
        summary: '第 3 回合从“封印守势”切换到“余烬失控”。',
      },
    ],
    keyPlayerBehaviors: [
      {
        actionType: 'attack',
        count: 2,
        summary: '玩家共使用“攻击”2 次。',
      },
      {
        actionType: 'special',
        count: 1,
        summary: '玩家共使用“特技”1 次。',
      },
      {
        actionType: 'heal',
        count: 1,
        summary: '玩家共使用“治疗”1 次。',
      },
    ],
  },
];

export const mockReviewPayload: ReviewPayload = {
  generatedAt: mockTimeline.reviewGeneratedAt,
  encounterId: mockBossEncounterDefinition.id,
  playerTags: ['exploration', 'story', 'risky'],
  combatSummary: {
    result: {
      result: 'victory',
      totalTurns: 4,
      finalTactic: 'counter',
      finalPhaseId: 'phase:embers-unbound',
      playerRemainingHp: 14,
      enemyRemainingHp: 21,
      summary: '本场首领战以“胜利”结束，共经历 4 回合，最终战术为“套路反制”。',
    },
    tacticChanges: mockCombatHistory[0].tacticChanges,
    phaseChanges: mockCombatHistory[0].phaseChanges,
    keyPlayerBehaviors: mockCombatHistory[0].keyPlayerBehaviors,
  },
  keyEvents: [
    '本场首领战以“胜利”结束，共经历 4 回合，最终战术为“套路反制”。',
    '首领在本场战斗中触发了 1 次阶段切换。',
    '首领共进行了 3 次可见战术切换。',
    '本轮流程中已完成 1 条任务线，仍有 2 条任务线处于进行中。',
  ],
  explanations: [
    {
      type: 'combat',
      title: '首领战术切换轨迹',
      summary: '首领共发生 3 次战术切换，说明它会根据回合推进与玩家习惯动态调整。',
      evidence: [
        '第 2 回合切换为“诱导陷阱”，当前阶段为“封印守势”。',
        '第 3 回合切换为“召唤支援”，当前阶段为“余烬失控”。',
        '第 4 回合切换为“套路反制”，当前阶段为“余烬失控”。',
      ],
    },
    {
      type: 'combat',
      title: '首领阶段变化',
      summary: '首领共进入 2 个阶段，阶段切换会直接影响战术偏好。',
      evidence: ['第 3 回合从“封印守势”切换到“余烬失控”。'],
    },
    {
      type: 'playerModel',
      title: '玩家行为重点',
      summary: '玩家本场最常用的操作为“攻击”、“特技”、“治疗”。',
      evidence: [
        '玩家共使用“攻击”2 次。',
        '玩家共使用“特技”1 次。',
        '玩家共使用“治疗”1 次。',
        '当前玩家标签：探索、剧情、高风险',
      ],
    },
  ],
  suggestions: [
    '下次面对“套路反制”时，避免连续重复攻击，穿插防御或解析来打断读招。',
    '留意首领阶段切换前的血量阈值，提前准备下一轮的应对资源。',
    '你已经摸清了首领节奏，下一次可以尝试更早逼出阶段切换并压缩战斗回合数。',
  ],
};

export const mockReviewState: ReviewState = {
  current: mockReviewPayload,
  history: [mockReviewPayload],
};
