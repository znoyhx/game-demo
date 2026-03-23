import {
  levelBuilderInputSchema,
  levelBuilderOutputSchema,
  type LevelBuilderInput,
  type LevelBuilderOutput,
} from '../../schemas';
import { mockIds } from '../../mocks';

import type { LevelBuilderAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

export class MockLevelBuilderAgent
  extends ValidatedMockAgent<LevelBuilderInput, LevelBuilderOutput>
  implements LevelBuilderAgent
{
  constructor() {
    super('level-builder', levelBuilderInputSchema, levelBuilderOutputSchema);
  }

  protected execute(input: LevelBuilderInput): LevelBuilderOutput {
    const interactionPoints = input.area.interactionPoints.map((point) => {
      if (
        input.area.id === mockIds.areas.archive &&
        point.targetId === mockIds.areas.sanctum
      ) {
        return {
          ...point,
          enabled:
            input.world.flags.archiveDoorOpened === true ||
            input.world.flags.sanctumSealBroken === true,
        };
      }

      return { ...point };
    });

    return {
      area: {
        ...input.area,
        interactionPoints,
      },
      interactionPoints,
    };
  }
}
