import type { AgentModuleId } from '../../agents';
import type { AnyGameDomainEvent } from '../../events/domainEvents';
import type {
  CombatResult,
  EnemyTacticType,
  PlayerProfileTag,
  WorldCreationFallbackReason,
  WorldCreationRequest,
} from '../../schemas';
import type { FeaturePanel, RouteId } from '../../types/appShell';

const routeText = {
  home: {
    label: '首页',
    summary: '像素锻炉代理的比赛优先入口。',
  },
  game: {
    label: '游戏',
    summary: '区域、角色、任务与战斗模块的主游玩界面。',
  },
  debug: {
    label: '调试',
    summary: '用于确定性场景测试与检查的快速入口。',
  },
  review: {
    label: '回顾',
    summary: '用于展示智能行为解释与总结的结算页面。',
  },
} satisfies Record<RouteId, { label: string; summary: string }>;

const startupSourceLabels = {
  pending: '启动中',
  save: '已载入存档',
  mock: '已载入样例世界',
  generated: '新世界已就绪',
} satisfies Record<'pending' | 'save' | 'mock' | 'generated', string>;

const startupReasonMessages = {
  booting: '正在检查持久化状态，并准备最近一次可游玩的世界。',
  'save-restored': '已通过持久化层恢复最近一次有效存档。',
  'no-save': '未找到历史存档，已为当前比赛演示切片载入默认样例世界。',
  'invalid-save': '检测到无效存档，启动流程已安全回退到默认样例世界。',
  'storage-error': '无法读取存档存储，启动流程已安全回退到默认样例世界。',
  'world-created': '新世界已完成初始化、状态注入与开局存档准备。',
} satisfies Record<
  | 'booting'
  | 'save-restored'
  | 'no-save'
  | 'invalid-save'
  | 'storage-error'
  | 'world-created',
  string
>;

const enemyTacticLabels = {
  aggressive: '压制强攻',
  defensive: '防守消耗',
  counter: '套路反制',
  trap: '诱导陷阱',
  summon: '召唤支援',
  'resource-lock': '资源封锁',
} satisfies Record<EnemyTacticType, string>;

const playerTagLabels = {
  exploration: '探索',
  story: '剧情',
  combat: '战斗',
  risky: '高风险',
  cautious: '谨慎',
  social: '社交',
  speedrun: '速通',
} satisfies Record<PlayerProfileTag, string>;

const combatResultLabels = {
  victory: '胜利',
  defeat: '失败',
  escape: '撤离',
} satisfies Record<CombatResult, string>;

const saveSourceLabels = {
  save: '存档',
  mock: '样例世界',
  auto: '自动',
  manual: '手动',
  debug: '调试',
} satisfies Record<'save' | 'mock' | 'auto' | 'manual' | 'debug', string>;

const featurePanelStatusLabels = {
  placeholder: '占位中',
  planned: '计划中',
  ready: '已就绪',
} satisfies Record<FeaturePanel['status'], string>;

const preferredModeLabels = {
  story: '剧情',
  exploration: '探索',
  combat: '战斗',
  hybrid: '混合',
} satisfies Record<WorldCreationRequest['preferredMode'], string>;

const worldCreationFallbackReasonLabels = {
  'world-architect-failed': '世界架构代理失败',
  'quest-designer-failed': '任务设计代理失败',
  'level-builder-failed': '关卡构建代理失败',
  'npc-pack-failed': '角色处理阶段失败',
  'event-pack-failed': '事件包生成失败',
  'resource-pack-failed': '资源包生成失败',
  'snapshot-invalid': '快照校验失败',
} satisfies Record<WorldCreationFallbackReason, string>;

const agentLabels = {
  'world-architect': '世界架构代理',
  'quest-designer': '任务设计代理',
  'level-builder': '关卡构建代理',
  'npc-brain': '角色思维代理',
  'enemy-tactician': '敌方战术代理',
  'game-master': '游戏主持代理',
  'player-model': '玩家模型代理',
  'explain-coach': '解释与教练代理',
} satisfies Record<AgentModuleId, string>;

const domainEventLabels = {
  AREA_ENTERED: '区域进入',
  NPC_INTERACTED: '角色互动',
  QUEST_UPDATED: '任务更新',
  TACTIC_CHANGED: '战术切换',
  COMBAT_STARTED: '战斗开始',
  COMBAT_ENDED: '战斗结束',
  EVENT_TRIGGERED: '事件触发',
  SAVE_CREATED: '存档创建',
  SAVE_RESTORED: '存档恢复',
  WORLD_LOADED: '世界载入',
  PLAYER_MODEL_UPDATED: '玩家模型更新',
  REVIEW_GENERATED: '回顾生成',
} satisfies Record<AnyGameDomainEvent['name'], string>;

const combatActionLabels = {
  attack: '攻击',
  guard: '防御',
  heal: '治疗',
  analyze: '解析',
  special: '特技',
  retreat: '撤退',
} satisfies Record<string, string>;

export const zhCN = {
  routes: routeText,
  labels: {
    startupSources: startupSourceLabels,
    startupReasons: startupReasonMessages,
    enemyTactics: enemyTacticLabels,
    playerTags: playerTagLabels,
    combatResults: combatResultLabels,
    saveSources: saveSourceLabels,
    featurePanelStatuses: featurePanelStatusLabels,
    preferredModes: preferredModeLabels,
    worldCreationFallbackReasons: worldCreationFallbackReasonLabels,
    agentLabels,
    domainEvents: domainEventLabels,
    combatActions: combatActionLabels,
    questStatuses: {
      locked: '未解锁',
      available: '可接取',
      active: '进行中',
      completed: '已完成',
      failed: '已失败',
    },
  },
  appLayout: {
    eyebrow: '像素锻炉代理',
    title: '比赛演示版骨架',
    subtitle:
      '以前端网页为先、以模拟实现为先，并按清晰分层为玩法、持久化、代理编排和调试工具做好承接。',
    badges: {
      milestone: '阶段 8：完整实现动态事件与导演模块',
      mockFirst: '模拟优先',
    },
    navigationAriaLabel: '主导航',
    pendingWorldBadge: '等待启动完成',
    readyWorldStatus: (currentAreaName: string | undefined, saveLabel: string) =>
      `${currentAreaName ? `${currentAreaName} 当前区域` : '世界壳层已就绪'} / ${saveLabel}`,
    pendingWorldStatus: '正在校验最近存档并准备首个可游玩状态。',
    startupSectionTitle: '启动流程进行中',
    startupControllerBadge: '启动控制器',
    startupControllerBody:
      '应用正在通过持久化抽象载入最近一次有效存档。如果没有可用的有效存档，将自动回退到确定性的样例世界。',
  },
  pages: {
    home: {
      title: '世界创建模块',
      description:
        '通过预设模板、一键默认生成、快速开局和开发测试种子，在一分钟内创建新的像素锻炉代理世界，并由经过契约校验的模拟代理驱动。',
      currentWorld: {
        kicker: '当前世界',
        continueBadge: '可继续游玩',
        sampleWorldBadge: '样例世界已激活',
        generatedWorldBadge: '新世界已创建',
        description:
          '你可以立刻继续最近一次世界，也可以通过世界架构师、任务设计师和关卡构建器的模拟流程重新打造一个新世界。',
        continueAction: '继续当前世界',
        debugAction: '打开调试入口',
        defaultWorldAction: '一键生成默认世界',
      },
      recoveryBadge: '回退提示',
      creationErrorBadge: '创建错误',
      unknownCreationError: '世界创建失败，且未能在异常前完成有效回退。',
      templates: {
        title: '预设模板',
        eyebrow: '快速开始',
        description: '先套用调好的配置，如果需要，再微调下面的字段。',
        footer: '每个预设都符合产品需求输入契约，并能生成完整的开局世界。',
        meta: (regions: number, factions: number, npcs: number) =>
          `${regions} 个区域 / ${factions} 个势力 / ${npcs} 名角色`,
        quickPlayAction: '快速开局',
        devModeAction: '开发/测试模式',
      },
      preview: {
        title: '预计生成结果',
        eyebrow: '预览',
        description: '创建控制器会先准备这些资源，然后再注入状态并保存开局快照。',
        footer: '最终输出由模拟代理流程生成，并在存档快照边界再次校验。',
        worldNameLabel: '世界名称',
        regionsLabel: '地图区域',
        factionsLabel: '核心势力',
        mainQuestSeedLabel: '主线任务种子',
        initialNpcSetLabel: '初始角色阵容',
        initialResourceSetupLabel: '初始资源配置',
        initialStoryPremiseLabel: '初始故事背景',
        worldName: (focusWord: string) => `${focusWord}之境`,
        regions: (focusWord: string) => [
          `${focusWord}前哨`,
          `${focusWord}秘库`,
          `${focusWord}圣所`,
        ],
        factions: (focusWord: string) => [
          `${focusWord}守望者`,
          `${focusWord}议庭`,
        ],
        resourceSetup: (worldStyleLabel: string) =>
          `${worldStyleLabel}瓦片集、分层区域背景与首领路线配乐`,
        storyPremise: (worldName: string, worldStyle: string, gameGoal: string) =>
          `${worldName}是一个${worldStyle}世界，你必须在最终防线崩溃前${gameGoal}。`,
      },
      customWorld: {
        title: '自定义世界',
        eyebrow: '输入契约',
        description: '产品需求要求的输入项都会在这里收集，并传入世界创建流程。',
        footer: '创建控制器会统一处理契约校验、快照注入、持久化和失败回退。',
        fields: {
          theme: '游戏主题',
          worldStyle: '世界风格',
          difficulty: '难度',
          gameGoal: '游戏目标',
          learningGoal: '学习目标（可选）',
          preference: '偏好',
          quickStart: '快速开局',
          devMode: '开发/测试模式',
        },
        difficultyOptions: {
          easy: '简单',
          normal: '普通',
          hard: '困难',
        },
        createAction: '生成自定义世界',
        creatingAction: '正在铸造世界...',
        resetAction: '重置为默认',
      },
    },
    debug: {
      title: '调试启动台',
      description:
        '通过同一套标准化创建流程直接启动模板、快速开局和开发测试场景，再查看运行时状态与日志，无需重复走完整创建流程。',
      scenarioShortcuts: {
        title: '场景快捷入口',
        eyebrow: '快速路径',
        description:
          '这些快捷入口会跳过完整创建表单，直接走标准化世界创建流程，生成初始存档并跳转到游戏场景。',
        footer: '用这些入口可以快速验证生成世界、模板世界和调试世界的启动效果。',
        templateWorldAction: '加载模板演示世界',
        quickPlayAction: '快速开局快捷入口',
        devModeAction: '开发/测试快捷入口',
      },
      launchErrorBadge: '调试启动错误',
      unknownLaunchError: '调试场景启动失败，世界尚未准备完成。',
      runtimeLogs: {
        title: '运行时日志',
        eyebrow: (count: number) => `${count} 条记录`,
        description: '强类型运行时日志会在这里提供给调试检查。',
        footer: '这里展示的数据来自轻量日志仓，而不是零散的控制台输出。',
        emptyState: '暂时还没有运行时日志。',
      },
      areaTools: {
        title: '区域调试控制',
        eyebrow: (areaName: string) => `目标区域：${areaName}`,
        description:
          '无需走完整进度链，即可直接进入任意区域、切换运行时解锁状态，并套用环境标记组合。',
        footer:
          '通过这些控件，可从调试入口验证隐藏路线、进出规则以及由环境驱动的场景变体。',
        areaField: '目标区域',
        environmentField: '环境状态',
        currentAreaLabel: '当前区域',
        selectedAreaLabel: '已选区域',
        lockStatusLabel: (value: string) => `通行状态：${value}`,
        discoveryStatusLabel: (value: string) => `发现状态：${value}`,
        hiddenStatusLabel: (value: string) => `显示状态：${value}`,
        currentEnvironmentLabel: (value: string) => `解析环境：${value}`,
        jumpAction: '直接跳转',
        jumpAndOpenAction: '跳转并打开游戏',
        unlockAction: '强制解锁',
        relockAction: '重新上锁',
        applyEnvironmentAction: '应用环境',
        hiddenAreaHint:
          '跳入隐藏区域时会同步发现并解锁它，便于你立即测试正式路线。',
        relockDisabledDefault:
          '默认开放区域依赖契约默认值，无法通过运行时状态重新上锁。',
        noAreaSelected: '请先选择一个区域，再启用直接区域调试。',
        unlockStateUnlocked: '已解锁',
        unlockStateLocked: '已上锁',
        discoveryStateDiscovered: '已发现',
        discoveryStateHidden: '未发现',
        hiddenStateHidden: '发现前隐藏',
        hiddenStateVisible: '导航中可见',
      },
      renderLab: {
        title: '渲染预览实验台',
        eyebrow: '独立渲染校验',
        description:
          '无需跑完整进度链，就能预览任意区域、标记层、对话面板或任务追踪。',
        footer:
          '在切换到正式像素场景实现之前，可先在这里校验各个渲染切片。',
        openSceneAction: '打开强制场景',
        clearForcedAction: '清除强制场景',
        liveBadge: '正式游玩路线',
        forcedBadge: (areaName: string) => `强制场景：${areaName}`,
        previewing: (areaName: string) => `正在预览：${areaName}`,
        mapAreaTitle: '地图区域',
        npcLayerTitle: '角色标记层',
        npcLayerDescription:
          '仅渲染角色与商店标记，用来独立校验场景叠层。',
        npcLayerFooter: (count: number) =>
          `${count} 个角色标记可用于独立渲染`,
        interactionLayerTitle: '交互点位',
        interactionLayerDescription:
          '无需完整推进区域流程，即可预览传送门、事件、物品与战斗标记。',
        interactionLayerFooter: (count: number) =>
          `当前场景共有 ${count} 个交互标记`,
      },
    },
    game: {
      title: '游戏场景',
      description:
        '游戏主路线已经为地图渲染、角色互动、任务推进与战斗模块预留了界面空间，并且不会把领域状态变更直接写进页面组件。',
    },
    review: {
      title: '回顾与解释',
      description:
        '这个页面已经为战斗总结、战术说明、任务分支原因和玩家模型输出预留好接入位置。',
      telemetry: {
        title: '回顾遥测',
        eyebrow: (count: number) => `${count} 条记录`,
        description: '解释载荷输入与代理决策会在这里提供给回顾界面。',
        footer: '与回顾相关的遥测数据已从共享的强类型日志仓中过滤出来。',
        emptyState: '暂时还没有回顾相关遥测记录。',
      },
    },
  },
  controllers: {
    worldCreation: {
      buildStoryPremise: (worldName: string, worldStyle: string, gameGoal: string) =>
        `${worldName}是一个${worldStyle}世界，你必须在最终防线崩溃前${gameGoal}。`,
      sharedLongTerm: (gameGoal: string) =>
        `最近一次世界创建简报指出：${gameGoal}。`,
      npcMemoryShortTerm: (preferredModeLabel: string, worldName: string) =>
        `已为${preferredModeLabel}玩法在${worldName}完成世界开局。`,
      npcPublicFact: (npcName: string, worldName: string) =>
        `${npcName} 已被部署在${worldName}的某处区域。`,
      npcTrustFact: (gameGoal: string, areaName: string) =>
        `想要${gameGoal}，就必须先稳住${areaName}。`,
      npcHiddenSecret: (worldName: string, areaName: string) =>
        `${worldName}里存在一个与${areaName}相连的高压节点。`,
      npcGoals: {
        guide: (gameGoal: string) => `引导玩家朝“${gameGoal}”推进。`,
        merchant: (gameGoal: string) => `为“${gameGoal}”维持队伍补给。`,
        scholar: (gameGoal: string) => `解释秘库如何支撑“${gameGoal}”。`,
        guard: (areaName: string) => `在世界压力升级时守住通往${areaName}的路线。`,
        boss: (gameGoal: string) => `阻止玩家完成“${gameGoal}”。`,
      },
      eventTitles: {
        areaDisruption: (areaName: string) => `${areaName}异动`,
        areaSignal: (areaName: string) => `${areaName}信号`,
        areaCountermeasure: (areaName: string) => `${areaName}反制`,
      },
      eventDescriptions: {
        opening: (worldName: string) =>
          `${worldName}以紧张局势开场，首个区域已经对这次新开局产生反应。`,
        midpoint: (gameGoal: string) =>
          `随着“${gameGoal}”不断推进，中段区域开始暴露新的压力。`,
        finale: (preferredModeLabel: string) =>
          `最终路线会针对玩家偏好的${preferredModeLabel}玩法给出明显反馈。`,
      },
      resources: {
        tileset: (worldStyleLabel: string) => `${worldStyleLabel}瓦片集`,
        background: (areaName: string) => `${areaName}背景`,
        music: (areaName: string) => `${areaName}配乐`,
        avatar: (npcName: string) => `${npcName}头像`,
      },
      encounterTitle: (worldName: string) => `${worldName}最终决战`,
      questInjectedNote: (questTitle: string) =>
        `任务“${questTitle}”已在世界创建阶段注入。`,
      playerModelRationale: {
        fromMode: (preferredModeLabel: string) =>
          `根据${preferredModeLabel}偏好生成初始玩家模型。`,
        devMode: '已启用开发/测试创建模式，便于直接检查场景。',
        demoMode: '当前开局路线优先保证玩家可读性与演示友好性。',
        stuckPoint: '当前尚未记录到玩家卡点。',
      },
      defaultMainQuestSeed: '初始任务已生成',
      pacingNote: (preferredModeLabel: string) =>
        `当前创建模式已针对${preferredModeLabel}玩法调优。`,
      initialSaveLabel: (worldName: string) => `${worldName}初始存档`,
      fallbackWorldName: (focusWord: string) => `${focusWord}之境`,
      fallbackFactionNames: {
        defenders: (focusWord: string) => `${focusWord}守望者`,
        disruptors: (focusWord: string) => `${focusWord}议庭`,
      },
      fallbackFactionDescriptions: {
        defenders: (worldName: string) => `用于维持${worldName}稳定的回退防卫阵营。`,
        disruptors: (worldName: string) => `用于扰乱${worldName}秩序的回退敌对阵营。`,
      },
      fallbackAreaNames: {
        outpost: (focusWord: string) => `${focusWord}前哨`,
        archive: (focusWord: string) => `${focusWord}秘库`,
        sanctum: (focusWord: string) => `${focusWord}圣所`,
      },
      fallbackAreaDescriptions: {
        opening: (worldName: string) => `${worldName}的回退开局区域。`,
        midpoint: (gameGoal: string) =>
          `用于支撑“${gameGoal}”的回退中段压力区域。`,
        finale: '用于守住最终目标的回退首领路线。',
      },
      fallbackSubtitle: (worldStyleLabel: string) => `${worldStyleLabel}回退种子`,
      fallbackQuestDescriptions: {
        main: (storyPremise: string, questDescription: string) =>
          `${storyPremise} 主线路径：${questDescription}`,
        side: (questDescription: string, index: number, preferredModeLabel: string) =>
          `${questDescription} 回退支线 ${index} 会进一步强化${preferredModeLabel}玩法。`,
      },
      missingTemplate: (templateId: string) => `未找到世界创建模板：${templateId}`,
      recoveryNotice: (fallbackReasonLabel: string) =>
        `世界创建已切换到确定性回退路径，原因：${fallbackReasonLabel}。`,
      logs: {
        worldArchitectInput: (
          theme: string,
          worldStyle: string,
          preferredModeLabel: string,
        ) => `主题=${theme}，风格=${worldStyle}，模式=${preferredModeLabel}`,
        worldArchitectOutput: (worldName: string, areaCount: number) =>
          `世界=${worldName}，区域数=${areaCount}`,
        questDesignerInput: (worldName: string) => `为 ${worldName} 生成任务种子`,
        questDesignerOutput: (questCount: number) => `已生成 ${questCount} 个任务`,
        levelBuilderInput: (areaId: string) => `区域=${areaId}`,
        levelBuilderOutput: (interactionPointCount: number) =>
          `交互点数量=${interactionPointCount}`,
      },
    },
    npcInteraction: {
      dialogueOptions: {
        greet: '山谷局势还在恶化，我们先把行动协调好。',
        ask: '把上一支巡逻队看到的情况告诉我。',
        trade: '把你现在能匀出来的补给给我看看。',
        quest: '我已经准备好接下一个任务了。',
        persuade: '相信我，这件事我能扛下来。',
        leave: '我们很快还会再谈。',
      },
    },
    combat: {
      playerCombatantName: '玩家',
      logs: {
        tacticianInput: (encounterId: string, turn: number, tagLabels: string[]) =>
          `遭遇=${encounterId}，回合=${turn}，标签=${tagLabels.join('、')}`,
        tacticianOutput: (tacticLabel: string) => `已选择战术 ${tacticLabel}`,
      },
    },
    playerModel: {
      logs: {
        inputSummary: (
          areaVisitCount: number,
          questChoiceCount: number,
          npcInteractionCount: number,
        ) =>
          `区域访问=${areaVisitCount}，任务选择=${questChoiceCount}，角色互动=${npcInteractionCount}`,
        outputSummary: (tagLabels: string[]) => `标签=${tagLabels.join('、')}`,
      },
    },
    questProgression: {
      activationNote: (questTitle: string) => `任务“${questTitle}”已进入进行中。`,
      branchMemoryNote: (branchId: string) => `任务分支 ${branchId} 已对该角色产生影响。`,
      branchSelectedNote: (branchLabel: string) => `已将任务分支切换为“${branchLabel}”。`,
      dynamicActivationNote: (questTitle: string) => `动态任务“${questTitle}”已自动触发。`,
      forceStatusNote: (statusLabel: string) =>
        `调试流程已将任务状态强制设为 ${statusLabel}。`,
      statusSyncNote: (questTitle: string, statusLabel: string) =>
        `任务“${questTitle}”状态已同步为${statusLabel}。`,
    },
    reviewGeneration: {
      noEncounter: '无',
      logs: {
        inputSummary: (encounterId: string, questCount: number, eventCount: number) =>
          `战斗=${encounterId}，任务数=${questCount}，事件数=${eventCount}`,
        outputSummary: (explanationCount: number) =>
          `回顾解释条数=${explanationCount}`,
      },
    },
  },
  logging: {
    domainEventSummary: (eventLabel: string) => `领域事件“${eventLabel}”已触发。`,
    npcInteractionSummary: '已记录一次角色互动结果。',
    combatStartedSummary: '一场战斗已开始。',
    tacticChangedSummary: (tacticLabel: string) => `战斗战术已切换为${tacticLabel}。`,
    combatEndedSummary: (resultLabel: string) => `本场战斗已结束，结果为${resultLabel}。`,
    saveCreatedSummary: '已创建新的存档。',
    saveRestoredSummary: '已恢复最近一次存档。',
    worldLoadedSummary: (sourceLabel: string) => `世界已从${sourceLabel}路径载入。`,
    npcDetailSummary: '角色已生成回复并更新关系状态。',
    combatDetailSummary: (turn: number, actionLabel: string, tacticLabel: string) =>
      `本场战斗在第 ${turn} 回合结算了动作${actionLabel}，敌方战术为${tacticLabel}。`,
    agentDecisionSummary: (agentLabel: string) => `${agentLabel} 已产出一次确定性决策。`,
    explanationInputSummary: '已为调试与回顾记录解释载荷输入。',
  },
} as const;

export type AppLocale = typeof zhCN;
