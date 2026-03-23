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
    const themeLabel = toTitleCase(input.theme);
    const world = {
      ...mockWorld,
      summary: {
        ...mockWorld.summary,
        id: `world:${input.theme.toLowerCase().replace(/\s+/g, '-')}`,
        name: themeLabel,
        subtitle: `${themeLabel} shaped for ${input.preferredMode} play`,
        theme: input.theme,
        tone: determineTone(input.difficulty),
        mode: input.preferredMode,
        createdAt: mockTimeline.worldCreatedAt,
      },
      weather:
        input.difficulty === 'hard' ? 'volatile ember storm' : mockWorld.weather,
      timeOfDay:
        input.preferredMode === 'story' ? 'blue dusk' : mockWorld.timeOfDay,
    };

    const areas = mockAreas.map((area) => ({
      ...area,
      description:
        input.preferredMode === 'combat' && area.type !== 'town'
          ? `${area.description} Enemy pressure is visibly higher in this route.`
          : area.description,
    }));

    return {
      world: {
        ...world,
        factions: mockWorld.factions,
      },
      areas,
      factions: mockWorld.factions,
    };
  }
}
