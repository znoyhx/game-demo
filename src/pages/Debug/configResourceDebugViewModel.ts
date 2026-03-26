import {
  difficultyPresets,
  resolveDebugFeatureFlags,
  resolveGameShellUiSettings,
  resolveSavePolicy,
} from '../../core/config';
import {
  findAreaBackgroundResource,
  findAvatarResource,
  listAreaBackgroundResources,
  listAvatarResources,
  listEncounterDefinitions,
  listEventDefinitions,
  listQuestTemplates,
} from '../../core/resources';
import type {
  Area,
  GameConfigState,
  NpcDefinition,
  ResourceDefinition,
  ResourceState,
} from '../../core/schemas';

export interface ConfigResourceDebugViewModel {
  configSummary: {
    activeProfileLabel: string;
    difficultyLabel: string;
    savePolicyLabel: string;
    autosaveLabel: string;
    autoLoadLabel: string;
    uiSummary: string;
    debugSummary: string;
  };
  profileOptions: Array<{
    id: 'standard' | 'presentation' | 'dev';
    label: string;
    isActive: boolean;
  }>;
  difficultyOptions: Array<{
    id: 'easy' | 'normal' | 'hard';
    label: string;
    isActive: boolean;
  }>;
  resourceSummary: {
    activeTheme: string;
    selectedBackgroundLabel: string;
    selectedTilesetLabel: string;
    selectedMusicLabel: string;
    loadedCount: number;
  };
  registryMetrics: Array<{
    label: string;
    value: string;
  }>;
  currentAreaEntries: Array<{
    id: string;
    label: string;
    resourceKey: string;
    registryHit: boolean;
    statusLabel: string;
    selected: boolean;
    loaded: boolean;
    canToggleLoad: boolean;
  }>;
}

const profileLabels = {
  standard: '标准配置档',
  presentation: '演示配置档',
  dev: '开发配置档',
} as const;

const emptyResourceLabel = '未匹配资源';

const resolveProfileId = (
  gameConfig: Pick<GameConfigState, 'devModeEnabled' | 'presentationModeEnabled'>,
) => {
  if (gameConfig.devModeEnabled) {
    return 'dev' as const;
  }

  if (gameConfig.presentationModeEnabled) {
    return 'presentation' as const;
  }

  return 'standard' as const;
};

const findResourceLabel = (
  entries: ResourceDefinition[],
  key: string | undefined,
  fallbackLabel = emptyResourceLabel,
) => {
  if (!key) {
    return '未指定资源';
  }

  return entries.find((entry) => entry.key === key)?.label ?? fallbackLabel;
};

export function buildConfigResourceDebugViewModel(options: {
  gameConfig: GameConfigState;
  resourceState: ResourceState;
  currentArea: Area | null;
  npcDefinitions: NpcDefinition[];
}): ConfigResourceDebugViewModel {
  const { gameConfig, resourceState, currentArea, npcDefinitions } = options;
  const activeProfileId = resolveProfileId(gameConfig);
  const difficultyPreset = difficultyPresets[gameConfig.difficulty];
  const savePolicy = resolveSavePolicy(gameConfig);
  const debugFlags = resolveDebugFeatureFlags(gameConfig);
  const shellUiSettings = resolveGameShellUiSettings(gameConfig);
  const registeredAreaBackgrounds = listAreaBackgroundResources();
  const registeredAvatars = listAvatarResources();
  const enabledDebugCount = Object.values(debugFlags).filter(Boolean).length;
  const activeBackground = currentArea
    ? findAreaBackgroundResource(currentArea.id)
    : null;
  const currentAreaNpcDefinitions = currentArea
    ? npcDefinitions.filter((npc) => currentArea.npcIds.includes(npc.id))
    : [];
  const currentAreaEntries = [
    ...(currentArea
      ? [
          {
            id: `background:${currentArea.id}`,
            label: `${currentArea.name}背景`,
            resourceKey: activeBackground?.key ?? '',
            registryHit: Boolean(activeBackground),
            statusLabel: activeBackground
              ? '背景注册表命中，可同步到当前资源选择。'
              : '背景注册表未命中，将回退到区域定义中的背景。'
              ,
            selected:
              Boolean(activeBackground?.key) &&
              resourceState.selectedBackgroundKey === activeBackground?.key,
            loaded: Boolean(
              activeBackground?.key &&
                resourceState.loadedResourceKeys.includes(activeBackground.key),
            ),
            canToggleLoad: Boolean(activeBackground?.key),
          },
        ]
      : []),
    ...currentAreaNpcDefinitions.map((npc) => {
      const avatar = findAvatarResource(npc.id);

      return {
        id: `avatar:${npc.id}`,
        label: `${npc.name}头像`,
        resourceKey: avatar?.key ?? '',
        registryHit: Boolean(avatar),
        statusLabel: avatar
          ? '头像注册表命中，可切换加载标记。'
          : '头像注册表未命中，仅保留角色定义中的备用信息。',
        selected: false,
        loaded: Boolean(
          avatar?.key && resourceState.loadedResourceKeys.includes(avatar.key),
        ),
        canToggleLoad: Boolean(avatar?.key),
      };
    }),
  ];

  const currentAreaHitCount = currentAreaEntries.filter(
    (entry) => entry.registryHit,
  ).length;

  return {
    configSummary: {
      activeProfileLabel: profileLabels[activeProfileId],
      difficultyLabel: difficultyPreset.label,
      savePolicyLabel: savePolicy.label,
      autosaveLabel: gameConfig.autosaveEnabled
        ? '自动保存：已开启'
        : '自动保存：已关闭',
      autoLoadLabel: gameConfig.autoLoadEnabled
        ? '自动读档：已开启'
        : '自动读档：已关闭',
      uiSummary: `底栏 ${shellUiSettings.maxBottomLines} 行 / 提示 ${shellUiSettings.maxTips} 条 / 日志 ${shellUiSettings.maxLogs} 条 / 关系 ${shellUiSettings.maxRelationships} 项 / 任务 ${shellUiSettings.maxVisibleQuests} 项`,
      debugSummary: `已启用 ${enabledDebugCount} 项调试工具`,
    },
    profileOptions: (Object.entries(profileLabels) as Array<
      [keyof typeof profileLabels, string]
    >).map(([id, label]) => ({
      id,
      label,
      isActive: id === activeProfileId,
    })),
    difficultyOptions: (
      Object.entries(difficultyPresets) as Array<
        [
          keyof typeof difficultyPresets,
          (typeof difficultyPresets)[keyof typeof difficultyPresets],
        ]
      >
    ).map(([id, preset]) => ({
      id,
      label: preset.label,
      isActive: id === gameConfig.difficulty,
    })),
    resourceSummary: {
      activeTheme: resourceState.activeTheme,
      selectedBackgroundLabel: findResourceLabel(
        resourceState.entries,
        resourceState.selectedBackgroundKey,
      ),
      selectedTilesetLabel: findResourceLabel(
        resourceState.entries,
        resourceState.selectedTilesetKey,
      ),
      selectedMusicLabel: findResourceLabel(
        resourceState.entries,
        resourceState.selectedMusicKey,
      ),
      loadedCount: resourceState.loadedResourceKeys.length,
    },
    registryMetrics: [
      {
        label: '背景注册数量',
        value: `${registeredAreaBackgrounds.length} 项`,
      },
      {
        label: '头像注册数量',
        value: `${registeredAvatars.length} 项`,
      },
      {
        label: '遭遇定义数量',
        value: `${listEncounterDefinitions().length} 项`,
      },
      {
        label: '事件定义数量',
        value: `${listEventDefinitions().length} 项`,
      },
      {
        label: '任务模板数量',
        value: `${listQuestTemplates().length} 项`,
      },
      {
        label: '当前区域命中率',
        value: currentArea
          ? `${currentAreaHitCount}/${currentAreaEntries.length || 0}`
          : '未进入区域',
      },
    ],
    currentAreaEntries,
  };
}
