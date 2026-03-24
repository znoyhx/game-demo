import type {
  CombatResult,
  EnemyTacticType,
  NpcDialogueIntent,
  NpcDisposition,
  NpcEmotionalState,
  PlayerProfileTag,
} from '../schemas';
import { locale } from './locale';

export const enemyTacticLabels: Record<EnemyTacticType, string> =
  locale.labels.enemyTactics;

export const playerTagLabels: Record<PlayerProfileTag, string> =
  locale.labels.playerTags;

export const combatResultLabels: Record<CombatResult, string> =
  locale.labels.combatResults;

export const npcDispositionLabels: Record<NpcDisposition, string> = {
  friendly: '友善',
  neutral: '中立',
  suspicious: '戒备',
  hostile: '敌对',
  afraid: '畏惧',
  secretive: '隐秘',
};

export const npcEmotionalStateLabels: Record<NpcEmotionalState, string> = {
  calm: '冷静',
  hopeful: '振奋',
  wary: '警觉',
  tense: '紧张',
  angry: '愤怒',
  grateful: '感激',
  resolute: '坚定',
  fearful: '不安',
};

export const npcDialogueIntentLabels: Record<NpcDialogueIntent, string> = {
  greet: '问候',
  ask: '询问',
  trade: '交易',
  quest: '任务',
  persuade: '说服',
  leave: '离开',
};

export const saveSourceLabels: Record<
  'save' | 'mock' | 'auto' | 'manual' | 'debug',
  string
> = locale.labels.saveSources;

export const uiToneLabels = {
  default: '常规',
  success: '顺利',
  warning: '警示',
  info: '信息',
  danger: '危险',
} as const;

export const formatEnemyTacticLabel = (tactic: EnemyTacticType) =>
  enemyTacticLabels[tactic];

export const formatPlayerTagLabel = (tag: PlayerProfileTag) =>
  playerTagLabels[tag];

export const formatCombatResultLabel = (result: CombatResult) =>
  combatResultLabels[result];

export const formatNpcDispositionLabel = (disposition: NpcDisposition) =>
  npcDispositionLabels[disposition];

export const formatNpcEmotionalStateLabel = (emotionalState: NpcEmotionalState) =>
  npcEmotionalStateLabels[emotionalState];

export const formatNpcDialogueIntentLabel = (intent: NpcDialogueIntent) =>
  npcDialogueIntentLabels[intent];
