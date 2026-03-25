import {
  playerModelDebugScenarioSchema,
  type PlayerModelDebugScenario,
} from '../../schemas';

import { mockIds } from './constants';

export const playerModelBehaviorReplayPresets: PlayerModelDebugScenario[] =
  playerModelDebugScenarioSchema.array().parse([
    {
      id: 'replay:archive-surveyor',
      label: '档案勘探回放',
      description: '通过区域探索、谨慎对话与支线选择重建探索型玩家画像。',
      replaySteps: [
        {
          kind: 'area-visit',
          areaId: mockIds.areas.crossroads,
        },
        {
          kind: 'exploration-search',
          resourceFound: true,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.archive,
        },
        {
          kind: 'npc-interaction',
          intent: 'ask',
          trustDelta: 1,
        },
        {
          kind: 'npc-interaction',
          intent: 'trade',
          relationshipDelta: 1,
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:careful-archive-route',
        },
      ],
      expectedTags: ['exploration', 'story', 'cautious'],
    },
    {
      id: 'replay:boss-rush',
      label: '首领速推回放',
      description: '以快节奏移动与高压战斗行为重建速推型玩家画像。',
      replaySteps: [
        {
          kind: 'area-visit',
          areaId: mockIds.areas.crossroads,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.archive,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.sanctum,
        },
        {
          kind: 'combat-choice',
          actionType: 'attack',
        },
        {
          kind: 'combat-choice',
          actionType: 'special',
        },
        {
          kind: 'npc-interaction',
          intent: 'leave',
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:fast-direct-route',
        },
      ],
      expectedTags: ['combat', 'speedrun', 'risky'],
    },
  ]);

export const playerModelPresetScenarios: PlayerModelDebugScenario[] =
  playerModelDebugScenarioSchema.array().parse([
    {
      id: 'scenario:diplomatic-scout',
      label: '外交侦察者',
      description: '优先收集线索、维护关系，并通过支线推进主线。',
      replaySteps: [
        {
          kind: 'area-visit',
          areaId: mockIds.areas.crossroads,
        },
        {
          kind: 'exploration-search',
          resourceFound: true,
        },
        {
          kind: 'npc-interaction',
          intent: 'greet',
          trustDelta: 1,
        },
        {
          kind: 'npc-interaction',
          intent: 'ask',
          trustDelta: 2,
        },
        {
          kind: 'npc-interaction',
          intent: 'trade',
          relationshipDelta: 2,
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:trust-allies-careful',
        },
      ],
      expectedTags: ['social', 'story', 'cautious'],
    },
    {
      id: 'scenario:reckless-vanguard',
      label: '冒进先锋',
      description: '强压推进并快速跳过非关键对话，观察系统如何转向反制。',
      replaySteps: [
        {
          kind: 'area-visit',
          areaId: mockIds.areas.crossroads,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.archive,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.sanctum,
        },
        {
          kind: 'combat-choice',
          actionType: 'attack',
        },
        {
          kind: 'combat-choice',
          actionType: 'special',
        },
        {
          kind: 'npc-interaction',
          intent: 'persuade',
          trustDelta: -1,
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:rush-risky-route',
        },
      ],
      expectedTags: ['combat', 'risky', 'speedrun'],
    },
    {
      id: 'scenario:story-cartographer',
      label: '剧情测绘者',
      description: '一边探索地图一边推进剧情节点，适合验证提示与评审展示。',
      replaySteps: [
        {
          kind: 'area-visit',
          areaId: mockIds.areas.crossroads,
        },
        {
          kind: 'exploration-search',
          resourceFound: true,
        },
        {
          kind: 'area-visit',
          areaId: mockIds.areas.archive,
        },
        {
          kind: 'npc-interaction',
          intent: 'quest',
          trustDelta: 1,
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:story-archive-trust',
        },
        {
          kind: 'quest-choice',
          choiceId: 'branch:story-relay-followup',
        },
      ],
      expectedTags: ['exploration', 'story', 'social'],
    },
  ]);

export const findPlayerModelBehaviorReplayPreset = (presetId: string) =>
  playerModelBehaviorReplayPresets.find((preset) => preset.id === presetId) ?? null;

export const findPlayerModelPresetScenario = (scenarioId: string) =>
  playerModelPresetScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
