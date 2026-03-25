import type {
  CombatEncounterDefinition,
  CombatHistoryEntry,
  CombatState,
  ReviewPayload,
  ReviewState,
} from '../../schemas';
import { buildReviewPayload } from '../../rules';

import { mockIds, mockTimeline } from './constants';
import { mockEventHistory } from './events';
import { mockPlayerModelState, mockPlayerState } from './player';
import { mockQuestProgress } from './quests';

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
    playerRemainingHp: 14,
    enemyRemainingHp: 21,
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

export const mockReviewPayload: ReviewPayload = buildReviewPayload({
  generatedAt: mockTimeline.reviewGeneratedAt,
  player: mockPlayerState,
  playerTags: mockPlayerState.profileTags,
  playerModel: mockPlayerModelState,
  difficulty: 'normal',
  reviewRequest: {
    trigger: 'combat',
  },
  reviewHistory: [],
  encounter: mockBossEncounterDefinition,
  combat: mockBossCombatState,
  combatHistory: mockCombatHistory,
  questProgress: mockQuestProgress,
  eventHistory: mockEventHistory,
});

export const mockReviewState: ReviewState = {
  current: mockReviewPayload,
  history: [mockReviewPayload],
};
