import type {
  CombatResult,
  EnemyTacticType,
  PlayerProfileTag,
} from '../schemas';
import { locale } from './locale';

export const enemyTacticLabels: Record<EnemyTacticType, string> =
  locale.labels.enemyTactics;

export const playerTagLabels: Record<PlayerProfileTag, string> =
  locale.labels.playerTags;

export const combatResultLabels: Record<CombatResult, string> =
  locale.labels.combatResults;

export const saveSourceLabels: Record<
  'save' | 'mock' | 'auto' | 'manual' | 'debug',
  string
> = locale.labels.saveSources;

export const formatEnemyTacticLabel = (tactic: EnemyTacticType) =>
  enemyTacticLabels[tactic];

export const formatPlayerTagLabel = (tag: PlayerProfileTag) =>
  playerTagLabels[tag];

export const formatCombatResultLabel = (result: CombatResult) =>
  combatResultLabels[result];
