import {
  worldArchitectInputSchema,
  worldArchitectOutputSchema,
  type WorldArchitectInput,
  type WorldArchitectOutput,
} from '../../schemas';
import { mockAreas, mockTimeline, mockWorld } from '../../mocks';

import type { WorldArchitectAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

const toTitleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toSentenceCase = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
};

const pickFocusWord = (value: string) =>
  toTitleCase(value).split(' ').find(Boolean) ?? 'Forge';

const determineTone = (
  difficulty: WorldArchitectInput['difficulty'],
): WorldArchitectOutput['world']['summary']['tone'] => {
  switch (difficulty) {
    case 'easy':
      return 'light';
    case 'hard':
      return 'dark';
    default:
      return 'mysterious';
  }
};

const determineTimeOfDay = (
  preferredMode: WorldArchitectInput['preferredMode'],
): string => {
  switch (preferredMode) {
    case 'story':
      return '青蓝薄暮';
    case 'combat':
      return '烽火守夜';
    case 'exploration':
      return '晨曦薄雾';
    default:
      return '暮光交替';
  }
};

const determineWeather = (
  difficulty: WorldArchitectInput['difficulty'],
): string => {
  switch (difficulty) {
    case 'easy':
      return '清朗暖风';
    case 'hard':
      return '躁动风暴';
    default:
      return '灰烬流风';
  }
};

const modeLabels = {
  story: '剧情',
  exploration: '探索',
  combat: '战斗',
  hybrid: '混合',
} as const;

export class MockWorldArchitectAgent
  extends ValidatedMockAgent<WorldArchitectInput, WorldArchitectOutput>
  implements WorldArchitectAgent
{
  constructor() {
    super(
      'world-architect',
      worldArchitectInputSchema,
      worldArchitectOutputSchema,
    );
  }

  protected execute(input: WorldArchitectInput): WorldArchitectOutput {
    const styleLabel = toTitleCase(input.worldStyle);
    const focusWord = pickFocusWord(input.theme);
    const worldName = `${focusWord}之境`;
    const storyPremise = `${worldName}是一个${input.worldStyle}世界，你必须在最终防线崩溃前${input.gameGoal.trim()}。`;
    const archiveUnlocked = input.quickStartEnabled || input.devModeEnabled;
    const sanctumUnlocked = input.devModeEnabled;

    const factions = [
      {
        ...mockWorld.factions[0],
        name: `${focusWord}守望者`,
        description: `以严密协作维持${worldName}稳定的主要防卫力量。`,
      },
      {
        ...mockWorld.factions[1],
        name: `${focusWord}议庭`,
        description: `趁危机扩大影响、试图把${worldName}拖向自身仪式议程的对立势力。`,
      },
    ];

    const world = {
      ...mockWorld,
      summary: {
        ...mockWorld.summary,
        id: `world:${toSlug(input.theme)}`,
        name: worldName,
        subtitle: `${styleLabel}，适配${modeLabels[input.preferredMode]}玩法`,
        theme: input.theme,
        tone: determineTone(input.difficulty),
        mode: input.preferredMode,
        createdAt: mockTimeline.worldCreatedAt,
      },
      factions,
      weather: determineWeather(input.difficulty),
      timeOfDay: determineTimeOfDay(input.preferredMode),
      flags: {
        tutorialCompleted: input.quickStartEnabled || input.devModeEnabled,
        bossUnlocked: sanctumUnlocked,
        finalAreaUnlocked: sanctumUnlocked,
        emergencyState: input.difficulty === 'hard',
        ashfallWarningSeen: false,
        archiveDoorOpened: archiveUnlocked,
        bromSupplyDelivered: false,
        archiveEchoSeen: false,
        sanctumSealBroken: false,
        rowanPatrolSecured: false,
        wardenAlertRaised: false,
      },
    };

    const areas = mockAreas.map((area, index) => {
      const areaNames = [
        `${focusWord}前哨`,
        `${focusWord}秘库`,
        `${focusWord}圣所`,
      ];
      const baseDescription = [
        `${worldName}的主要集结区，用来快速引出这次冒险的核心冲突。`,
        `压力逐步抬升的中段区域，通往“${input.gameGoal.trim()}”的路径会在这里变得具体。`,
        `最终对决区域，在这里你必须真正面对“${toSentenceCase(input.gameGoal)}”的代价。`,
      ][index];

      return {
        ...area,
        name: areaNames[index] ?? area.name,
        description:
          input.preferredMode === 'combat' && area.type !== 'town'
            ? `${baseDescription} 这条路线上的敌方压力会明显更高。`
            : baseDescription,
        unlockedByDefault:
          index === 0 ? true : index === 1 ? archiveUnlocked : sanctumUnlocked,
      };
    });

    return {
      world: {
        ...world,
        areaIds: areas.map((area) => area.id),
      },
      areas,
      factions,
      storyPremise,
    };
  }
}
