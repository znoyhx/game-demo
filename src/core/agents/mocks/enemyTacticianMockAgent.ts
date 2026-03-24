import {
  enemyTacticianInputSchema,
  enemyTacticianOutputSchema,
  type EnemyTacticianInput,
  type EnemyTacticianOutput,
} from '../../schemas';
import { formatEnemyTacticLabel } from '../../utils/displayLabels';

import type { EnemyTacticianAgent } from '../interfaces';
import { ValidatedMockAgent } from './baseMockAgent';

export class MockEnemyTacticianAgent
  extends ValidatedMockAgent<EnemyTacticianInput, EnemyTacticianOutput>
  implements EnemyTacticianAgent
{
  constructor() {
    super(
      'enemy-tactician',
      enemyTacticianInputSchema,
      enemyTacticianOutputSchema,
    );
  }

  protected execute(input: EnemyTacticianInput): EnemyTacticianOutput {
    const enemyHealthRatio =
      input.combatState.enemy.maxHp === 0
        ? 0
        : input.combatState.enemy.hp / input.combatState.enemy.maxHp;

    const selectedTactic = input.playerTags.includes('risky')
      ? 'counter'
      : enemyHealthRatio <= 0.35
        ? 'aggressive'
        : input.playerTags.includes('cautious')
          ? 'summon'
          : input.playerTags.includes('combat')
            ? 'defensive'
            : input.encounter.tacticPool[0];

    return {
      selectedTactic,
      reason:
        selectedTactic === 'counter'
          ? '玩家的行动模式偏向强攻，因此 mock 战术代理选择用反击惩罚正面压制。'
          : `mock 战术代理从遭遇战术池中选择了${formatEnemyTacticLabel(selectedTactic)}。`,
    };
  }
}
