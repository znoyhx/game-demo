import {
  type CombatTuningPreset,
  type DebugFeatureFlags,
  type DifficultyPreset,
  type GameConfigState,
  type GameDifficulty,
  type GameShellUiSettings,
  type SavePolicy,
  type SavePolicyReason,
  combatTuningPresetSchema,
  debugFeatureFlagsSchema,
  difficultyPresetSchema,
  gameShellUiSettingsSchema,
  savePolicySchema,
} from '../schemas';

const buildDifficultyPreset = (preset: DifficultyPreset): DifficultyPreset =>
  difficultyPresetSchema.parse(preset);

const buildCombatTuningPreset = (
  preset: CombatTuningPreset,
): CombatTuningPreset => combatTuningPresetSchema.parse(preset);

const buildSavePolicy = (policy: SavePolicy): SavePolicy =>
  savePolicySchema.parse(policy);

const buildDebugFeatureFlags = (
  flags: DebugFeatureFlags,
): DebugFeatureFlags => debugFeatureFlagsSchema.parse(flags);

const buildGameShellUiSettings = (
  settings: GameShellUiSettings,
): GameShellUiSettings => gameShellUiSettingsSchema.parse(settings);

export const difficultyPresets = {
  easy: buildDifficultyPreset({
    id: 'easy',
    label: '引导难度',
    summary: '适合快速体验核心循环，开局资源更充足，世界张力更低。',
    worldTone: 'light',
    defaultWeather: '清朗暖风',
    startingPlayer: {
      hp: 36,
      maxHp: 36,
      gold: 30,
      energy: 12,
    },
    initialWorldTension: 24,
  }),
  normal: buildDifficultyPreset({
    id: 'normal',
    label: '均衡难度',
    summary: '平衡探索、对话与战斗压力，适合作为默认演示配置。',
    worldTone: 'mysterious',
    defaultWeather: '灰烬流风',
    startingPlayer: {
      hp: 30,
      maxHp: 30,
      gold: 20,
      energy: 10,
    },
    initialWorldTension: 48,
  }),
  hard: buildDifficultyPreset({
    id: 'hard',
    label: '高压难度',
    summary: '更高的前线张力与更强的敌方压制，更适合压测与策略展示。',
    worldTone: 'dark',
    defaultWeather: '躁动风暴',
    startingPlayer: {
      hp: 26,
      maxHp: 26,
      gold: 16,
      energy: 9,
    },
    initialWorldTension: 72,
  }),
} satisfies Record<GameDifficulty, DifficultyPreset>;

export const combatTuningPresets = {
  easy: buildCombatTuningPreset({
    id: 'combat-tuning:easy',
    difficulty: 'easy',
    label: '轻压制战斗曲线',
    baseEnemyHp: 90,
    minimumEnemyHp: 60,
    baseEnemyHpMultiplier: 0.92,
    playerModelBiasStep: 0.08,
    minimumResolvedEnemyHpMultiplier: 0.82,
    maximumResolvedEnemyHpMultiplier: 1.22,
  }),
  normal: buildCombatTuningPreset({
    id: 'combat-tuning:normal',
    difficulty: 'normal',
    label: '均衡战斗曲线',
    baseEnemyHp: 90,
    minimumEnemyHp: 60,
    baseEnemyHpMultiplier: 1,
    playerModelBiasStep: 0.08,
    minimumResolvedEnemyHpMultiplier: 0.82,
    maximumResolvedEnemyHpMultiplier: 1.22,
  }),
  hard: buildCombatTuningPreset({
    id: 'combat-tuning:hard',
    difficulty: 'hard',
    label: '高压战斗曲线',
    baseEnemyHp: 90,
    minimumEnemyHp: 60,
    baseEnemyHpMultiplier: 1.08,
    playerModelBiasStep: 0.08,
    minimumResolvedEnemyHpMultiplier: 0.82,
    maximumResolvedEnemyHpMultiplier: 1.22,
  }),
} satisfies Record<GameDifficulty, CombatTuningPreset>;

const allAutoSaveReasons = [
  'generic',
  'area-transition',
  'quest-update',
  'npc-interaction',
  'combat-end',
  'event-trigger',
  'exploration',
  'review-generation',
  'player-model-update',
] satisfies SavePolicyReason[];

export const savePolicies = {
  standard: buildSavePolicy({
    id: 'save-policy:standard',
    label: '标准自动存档',
    summary: '保留所有关键节点自动存档，兼顾稳定性与演示连续性。',
    allowManualSave: true,
    autoLoadOnStartup: true,
    autoSaveReasons: allAutoSaveReasons,
  }),
  presentation: buildSavePolicy({
    id: 'save-policy:presentation',
    label: '演示轻量存档',
    summary: '保留关键剧情、探索与战斗节点自动存档，减少展示期的噪声写入。',
    allowManualSave: true,
    autoLoadOnStartup: true,
    autoSaveReasons: allAutoSaveReasons.filter(
      (reason) => reason !== 'review-generation' && reason !== 'player-model-update',
    ),
  }),
  debug: buildSavePolicy({
    id: 'save-policy:debug',
    label: '调试全量存档',
    summary: '尽量保留所有自动存档触发点，便于调试回放与状态恢复。',
    allowManualSave: true,
    autoLoadOnStartup: true,
    autoSaveReasons: allAutoSaveReasons,
  }),
} satisfies Record<'standard' | 'presentation' | 'debug', SavePolicy>;

export const debugFeatureProfiles = {
  standard: buildDebugFeatureFlags({
    scenarioShortcuts: true,
    areaTools: true,
    questTools: true,
    eventTools: true,
    npcTools: true,
    playerModelTools: true,
    combatTools: true,
    renderingTools: true,
  }),
  presentation: buildDebugFeatureFlags({
    scenarioShortcuts: true,
    areaTools: true,
    questTools: true,
    eventTools: true,
    npcTools: true,
    playerModelTools: true,
    combatTools: true,
    renderingTools: false,
  }),
  dev: buildDebugFeatureFlags({
    scenarioShortcuts: true,
    areaTools: true,
    questTools: true,
    eventTools: true,
    npcTools: true,
    playerModelTools: true,
    combatTools: true,
    renderingTools: true,
  }),
} satisfies Record<'standard' | 'presentation' | 'dev', DebugFeatureFlags>;

export const gameShellUiProfiles = {
  standard: buildGameShellUiSettings({
    maxBottomLines: 4,
    maxTips: 4,
    maxLogs: 4,
    maxRelationships: 5,
    maxVisibleQuests: 4,
  }),
  presentation: buildGameShellUiSettings({
    maxBottomLines: 5,
    maxTips: 5,
    maxLogs: 5,
    maxRelationships: 4,
    maxVisibleQuests: 3,
  }),
  dev: buildGameShellUiSettings({
    maxBottomLines: 5,
    maxTips: 5,
    maxLogs: 6,
    maxRelationships: 6,
    maxVisibleQuests: 5,
  }),
} satisfies Record<'standard' | 'presentation' | 'dev', GameShellUiSettings>;

export const getDifficultyPreset = (difficulty: GameDifficulty) =>
  difficultyPresets[difficulty];

export const getCombatTuningPreset = (difficulty: GameDifficulty) =>
  combatTuningPresets[difficulty];

export const resolveSavePolicy = (gameConfig: Pick<
  GameConfigState,
  'autosaveEnabled' | 'autoLoadEnabled' | 'devModeEnabled' | 'presentationModeEnabled'
>) => {
  if (gameConfig.devModeEnabled) {
    return savePolicies.debug;
  }

  if (gameConfig.presentationModeEnabled) {
    return savePolicies.presentation;
  }

  return savePolicies.standard;
};

export const shouldAutoSaveForReason = (
  gameConfig: Pick<
    GameConfigState,
    'autosaveEnabled' | 'autoLoadEnabled' | 'devModeEnabled' | 'presentationModeEnabled'
  >,
  reason: SavePolicyReason,
) => {
  if (!gameConfig.autosaveEnabled) {
    return false;
  }

  return resolveSavePolicy(gameConfig).autoSaveReasons.includes(reason);
};

export const shouldAutoLoadLatestSave = (
  gameConfig: Pick<
    GameConfigState,
    'autosaveEnabled' | 'autoLoadEnabled' | 'devModeEnabled' | 'presentationModeEnabled'
  >,
) => gameConfig.autoLoadEnabled && resolveSavePolicy(gameConfig).autoLoadOnStartup;

export const resolveDebugFeatureFlags = (
  gameConfig: Pick<GameConfigState, 'devModeEnabled' | 'presentationModeEnabled'>,
) => {
  if (gameConfig.devModeEnabled) {
    return debugFeatureProfiles.dev;
  }

  if (gameConfig.presentationModeEnabled) {
    return debugFeatureProfiles.presentation;
  }

  return debugFeatureProfiles.standard;
};

export const resolveGameShellUiSettings = (
  gameConfig: Pick<GameConfigState, 'devModeEnabled' | 'presentationModeEnabled'>,
) => {
  if (gameConfig.devModeEnabled) {
    return gameShellUiProfiles.dev;
  }

  if (gameConfig.presentationModeEnabled) {
    return gameShellUiProfiles.presentation;
  }

  return gameShellUiProfiles.standard;
};
