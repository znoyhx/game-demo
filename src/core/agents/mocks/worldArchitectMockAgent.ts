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
      return 'blue dusk';
    case 'combat':
      return 'ember watch';
    case 'exploration':
      return 'sunrise haze';
    default:
      return 'twilight shift';
  }
};

const determineWeather = (
  difficulty: WorldArchitectInput['difficulty'],
): string => {
  switch (difficulty) {
    case 'easy':
      return 'clear ember wind';
    case 'hard':
      return 'volatile stormfront';
    default:
      return 'ash-lit draft';
  }
};

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
    const worldName = `${focusWord} Reach`;
    const storyPremise = `${worldName} is a ${input.worldStyle} realm where you must ${input.gameGoal.trim()} before the final wardline collapses.`;
    const archiveUnlocked = input.quickStartEnabled || input.devModeEnabled;
    const sanctumUnlocked = input.devModeEnabled;

    const factions = [
      {
        ...mockWorld.factions[0],
        name: `${focusWord} Wardens`,
        description: `The primary defenders trying to keep ${worldName} stable through disciplined coordination.`,
      },
      {
        ...mockWorld.factions[1],
        name: `${focusWord} Court`,
        description: `A rival power exploiting the crisis to redirect ${worldName} toward its own ritual agenda.`,
      },
    ];

    const world = {
      ...mockWorld,
      summary: {
        ...mockWorld.summary,
        id: `world:${toSlug(input.theme)}`,
        name: worldName,
        subtitle: `${styleLabel} shaped for ${input.preferredMode} play`,
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
        `${focusWord} Crossroads`,
        `${focusWord} Archive`,
        `${focusWord} Sanctum`,
      ];
      const baseDescription = [
        `The main staging district for ${worldName}, designed to introduce the central conflict quickly.`,
        `A pressure-building middle region where the route to ${input.gameGoal.trim()} becomes tangible.`,
        `The final confrontation zone where ${toSentenceCase(
          input.gameGoal,
        )}.`,
      ][index];

      return {
        ...area,
        name: areaNames[index] ?? area.name,
        description:
          input.preferredMode === 'combat' && area.type !== 'town'
            ? `${baseDescription} Enemy pressure is visibly higher in this route.`
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
