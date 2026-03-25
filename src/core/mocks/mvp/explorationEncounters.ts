import type {
  CombatEncounterDefinition,
  CombatMode,
  EnemyTacticType,
} from '../../schemas';

type ExplorationEncounterTemplate = Pick<
  CombatEncounterDefinition,
  'mode' | 'tacticPool'
> & {
  archetype: string;
  title: string;
};

const buildTemplate = (
  archetype: string,
  title: string,
  tacticPool: EnemyTacticType[],
  mode: CombatMode = 'turn-based',
): ExplorationEncounterTemplate => ({
  archetype,
  title,
  mode,
  tacticPool,
});

export const mockExplorationEncounterTemplates: Record<
  string,
  ExplorationEncounterTemplate
> = {
  'ash-scout': buildTemplate('ash-scout', '灰烬斥候伏击', [
    'aggressive',
    'counter',
    'trap',
  ]),
  'echo-sentry': buildTemplate('echo-sentry', '回响守卫拦截', [
    'defensive',
    'counter',
    'resource-lock',
  ]),
  'seal-ward': buildTemplate('seal-ward', '封印壁垒反制', [
    'defensive',
    'resource-lock',
    'summon',
  ]),
  'ember-trap': buildTemplate('ember-trap', '余烬陷阱围堵', [
    'trap',
    'resource-lock',
    'counter',
  ]),
  'shadow-lurker': buildTemplate('shadow-lurker', '潜影伏击', [
    'aggressive',
    'trap',
    'counter',
  ]),
};

export const buildExplorationEncounterTemplate = (options: {
  encounterId: string;
  areaId: string;
  archetype: string;
  fallbackTitle: string;
}): CombatEncounterDefinition => {
  const template = mockExplorationEncounterTemplates[options.archetype];

  return {
    id: options.encounterId,
    title: template?.title ?? options.fallbackTitle,
    mode: template?.mode ?? 'turn-based',
    areaId: options.areaId,
    tacticPool: template?.tacticPool ?? ['aggressive', 'defensive', 'counter'],
  };
};
