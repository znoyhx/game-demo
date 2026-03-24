import type {
  QuestDefinition,
  QuestHistoryEntry,
  QuestProgress,
} from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockQuestDefinitions: QuestDefinition[] = [
  {
    id: mockIds.quests.tutorial,
    type: 'tutorial',
    title: '校准前哨火标',
    description: '在灰烬岔路口完成一次演示级巡检，确保守护火线读数稳定。',
    giverNpcId: mockIds.npcs.lyra,
    triggerConditions: [],
    completionConditions: [
      {
        id: 'condition:tutorial-visit-beacon',
        label: '检查前哨信标',
        type: 'visit',
        targetId: 'point:cartography-beacon',
      },
      {
        id: 'condition:tutorial-report-lyra',
        label: '向莱拉回报巡检结果',
        type: 'talk',
        targetId: mockIds.npcs.lyra,
      },
    ],
    reward: {
      exp: 16,
      gold: 8,
      worldFlags: ['tutorialCompleted'],
    },
    failureConditions: [],
    dependencies: [],
    branchResults: [],
  },
  {
    id: mockIds.quests.main,
    type: 'main',
    title: '重燃守护火线',
    description: '修复秘库中继，让通往余烬圣所的道路重新开启。',
    giverNpcId: mockIds.npcs.lyra,
    triggerConditions: [
      {
        id: 'trigger:main-tutorial-complete',
        label: '完成前哨引导',
        type: 'world-flag',
        targetId: 'tutorialCompleted',
      },
    ],
    completionConditions: [
      {
        id: 'condition:main-brief-lyra',
        label: '在路口听取莱拉的简报',
        type: 'talk',
        targetId: mockIds.npcs.lyra,
      },
      {
        id: 'condition:main-recover-relay-core',
        label: '从沉没秘库取回中继核心',
        type: 'collect',
        targetId: 'item:relay-core',
        requiredCount: 1,
      },
      {
        id: 'condition:main-open-sanctum',
        label: '打破圣所封印',
        type: 'trigger',
        targetId: 'flag:sanctumSealBroken',
      },
      {
        id: 'condition:main-defeat-warden',
        label: '击败灰烬守卫',
        type: 'battle',
        targetId: mockIds.encounter,
      },
    ],
    reward: {
      exp: 120,
      gold: 90,
      worldFlags: ['sanctumSealBroken'],
    },
    dependencies: [],
    failureConditions: [
      {
        id: 'failure:main-wardline-collapsed',
        label: '守护火线崩塌',
        type: 'world-flag',
        targetId: 'wardlineCollapsed',
      },
    ],
    branchResults: [
      {
        id: 'branch:main-trust-rowan',
        label: '争取罗文的巡逻支援',
        description: '秘库路线会更安全，但首领也会更早完成准备。',
        activationConditions: [],
        reward: {
          exp: 20,
        },
        setsWorldFlags: ['rowanPatrolSecured'],
        changesNpcRelation: [
          {
            npcId: mockIds.npcs.rowan,
            delta: 10,
          },
        ],
      },
      {
        id: 'branch:main-trust-mirel',
        label: '借助米蕾尔的秘库笔记',
        description: '可以更快锁定圣所弱点，但会让秘库线索提前曝光。',
        activationConditions: [],
        reward: {
          exp: 18,
          gold: 12,
        },
        setsWorldFlags: ['mirelNotesSecured'],
        changesNpcRelation: [
          {
            npcId: mockIds.npcs.mirel,
            delta: 12,
          },
        ],
      },
    ],
  },
  {
    id: mockIds.quests.sideSupply,
    type: 'side',
    title: '调制余烬药剂',
    description: '在下一波灰风到来前，帮布罗姆补齐他的余烬药剂材料。',
    giverNpcId: mockIds.npcs.brom,
    triggerConditions: [
      {
        id: 'trigger:side-supply-tutorial',
        label: '完成前哨引导',
        type: 'world-flag',
        targetId: 'tutorialCompleted',
      },
    ],
    completionConditions: [
      {
        id: 'condition:supply-gather-herbs',
        label: '在秘库边缘采集暮色草药',
        type: 'collect',
        targetId: 'item:dusk-herb',
        requiredCount: 3,
      },
      {
        id: 'condition:supply-return-brom',
        label: '把草药带回给布罗姆',
        type: 'talk',
        targetId: mockIds.npcs.brom,
      },
    ],
    reward: {
      exp: 30,
      gold: 18,
      items: ['item:cinder-tonic'],
      worldFlags: ['bromSupplyDelivered'],
    },
    failureConditions: [],
    dependencies: [],
    branchResults: [],
  },
  {
    id: mockIds.quests.sideArchive,
    type: 'side',
    title: '记录秘库回响',
    description: '协助米蕾尔记录那些会对守护火线产生反应的低语。',
    giverNpcId: mockIds.npcs.mirel,
    triggerConditions: [
      {
        id: 'trigger:side-archive-echo',
        label: '目睹秘库回响',
        type: 'world-flag',
        targetId: 'archiveEchoSeen',
      },
      {
        id: 'trigger:side-archive-area',
        label: '进入沉没秘库',
        type: 'visited-area',
        targetId: mockIds.areas.archive,
      },
    ],
    completionConditions: [
      {
        id: 'condition:archive-inspect-plinth',
        label: '检查会说话的石座',
        type: 'visit',
        targetId: 'point:speaking-plinth',
      },
      {
        id: 'condition:archive-report-mirel',
        label: '把回响规律汇报给米蕾尔',
        type: 'talk',
        targetId: mockIds.npcs.mirel,
      },
    ],
    reward: {
      exp: 28,
      gold: 12,
      worldFlags: ['archiveEchoSeen'],
    },
    failureConditions: [],
    dependencies: [],
    branchResults: [],
  },
  {
    id: mockIds.quests.sidePatrol,
    type: 'side',
    title: '守住南侧关口',
    description: '在灰烬守卫作出反应前，协助罗文稳住通往秘库的入口。',
    giverNpcId: mockIds.npcs.rowan,
    triggerConditions: [
      {
        id: 'trigger:side-patrol-main-active',
        label: '主线已展开',
        type: 'quest-status',
        targetId: mockIds.quests.main,
        requiredStatus: 'active',
      },
    ],
    completionConditions: [
      {
        id: 'condition:patrol-check-barrier',
        label: '检查南侧屏障',
        type: 'visit',
        targetId: 'point:south-barrier',
      },
      {
        id: 'condition:patrol-report-rowan',
        label: '带着巡逻报告返回找罗文',
        type: 'talk',
        targetId: mockIds.npcs.rowan,
      },
    ],
    reward: {
      exp: 26,
      gold: 15,
      worldFlags: ['rowanPatrolSecured'],
    },
    failureConditions: [],
    dependencies: [],
    branchResults: [],
  },
  {
    id: mockIds.quests.hidden,
    type: 'hidden',
    title: '追回禁咏残页',
    description: '只有在米蕾尔确认你能保守秘密后，她才会提起那段被封存的禁咏。',
    giverNpcId: mockIds.npcs.mirel,
    triggerConditions: [
      {
        id: 'trigger:hidden-echo-seen',
        label: '已经看见秘库回响',
        type: 'world-flag',
        targetId: 'archiveEchoSeen',
      },
      {
        id: 'trigger:hidden-mirel-trust',
        label: '米蕾尔足够信任你',
        type: 'npc-trust',
        targetId: mockIds.npcs.mirel,
        minTrust: 30,
      },
    ],
    dependencies: [
      {
        questId: mockIds.quests.sideArchive,
        requiredStatus: 'completed',
      },
    ],
    completionConditions: [
      {
        id: 'condition:hidden-question-mirel',
        label: '向米蕾尔追问禁咏线索',
        type: 'talk',
        targetId: mockIds.npcs.mirel,
      },
      {
        id: 'condition:hidden-recover-scroll',
        label: '找回禁咏残页',
        type: 'collect',
        targetId: 'item:sealed-chant',
        requiredCount: 1,
      },
    ],
    failureConditions: [],
    branchResults: [
      {
        id: 'branch:hidden-seal',
        label: '封存残页',
        description: '交还残页并要求米蕾尔立刻封存，守住现有秩序。',
        activationConditions: [],
        reward: {
          exp: 22,
          gold: 10,
        },
        setsWorldFlags: ['hiddenChantSealed'],
        changesNpcRelation: [
          {
            npcId: mockIds.npcs.mirel,
            delta: 6,
          },
        ],
      },
      {
        id: 'branch:hidden-study',
        label: '研读残页',
        description: '暂时保留残页，用来换取更多关于圣所弱点的知识。',
        activationConditions: [],
        reward: {
          exp: 26,
        },
        setsWorldFlags: ['hiddenChantStudied'],
        changesNpcRelation: [
          {
            npcId: mockIds.npcs.mirel,
            delta: -4,
          },
        ],
      },
    ],
  },
  {
    id: mockIds.quests.dynamic,
    type: 'dynamic',
    title: '压制守卫反制',
    description: '当圣所开始主动反制时，必须立刻切断一处反制节点，避免局势失控。',
    giverNpcId: mockIds.npcs.rowan,
    triggerConditions: [
      {
        id: 'trigger:dynamic-current-area',
        label: '已经进入余烬圣所',
        type: 'current-area',
        targetId: mockIds.areas.sanctum,
      },
      {
        id: 'trigger:dynamic-warden-alert',
        label: '守卫反制已经抬升',
        type: 'world-flag',
        targetId: 'wardenAlertRaised',
      },
    ],
    completionConditions: [
      {
        id: 'condition:dynamic-break-node',
        label: '切断一处反制节点',
        type: 'trigger',
        targetId: 'flag:countermeasureNodeBroken',
      },
      {
        id: 'condition:dynamic-report-rowan',
        label: '把节点状况告知罗文',
        type: 'talk',
        targetId: mockIds.npcs.rowan,
      },
    ],
    failureConditions: [
      {
        id: 'failure:dynamic-seal-broken',
        label: '圣所封印提前崩裂',
        type: 'world-flag',
        targetId: 'sanctumSealBroken',
      },
    ],
    reward: {
      exp: 24,
      gold: 14,
      worldFlags: ['countermeasureSuppressed'],
    },
    dependencies: [],
    branchResults: [],
  },
];

export const mockQuestProgress: QuestProgress[] = [
  {
    questId: mockIds.quests.tutorial,
    status: 'completed',
    currentObjectiveIndex: 2,
    completedObjectiveIds: [
      'condition:tutorial-visit-beacon',
      'condition:tutorial-report-lyra',
    ],
    updatedAt: mockTimeline.lyraInteractionAt,
  },
  {
    questId: mockIds.quests.main,
    status: 'active',
    currentObjectiveIndex: 1,
    completedObjectiveIds: ['condition:main-brief-lyra'],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.sideSupply,
    status: 'completed',
    currentObjectiveIndex: 2,
    completedObjectiveIds: [
      'condition:supply-gather-herbs',
      'condition:supply-return-brom',
    ],
    updatedAt: mockTimeline.bromInteractionAt,
  },
  {
    questId: mockIds.quests.sideArchive,
    status: 'active',
    currentObjectiveIndex: 1,
    completedObjectiveIds: ['condition:archive-inspect-plinth'],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.sidePatrol,
    status: 'available',
    currentObjectiveIndex: 0,
    completedObjectiveIds: [],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.hidden,
    status: 'locked',
    currentObjectiveIndex: 0,
    completedObjectiveIds: [],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.dynamic,
    status: 'locked',
    currentObjectiveIndex: 0,
    completedObjectiveIds: [],
    updatedAt: mockTimeline.archiveEventAt,
  },
];

export const mockQuestHistory: QuestHistoryEntry[] = [
  {
    questId: mockIds.quests.tutorial,
    status: 'completed',
    note: '前哨火标已经完成校准，后续主线可以稳定展开。',
    updatedAt: mockTimeline.lyraInteractionAt,
  },
  {
    questId: mockIds.quests.sideSupply,
    status: 'completed',
    note: '玩家交回草药后，布罗姆把一份备用药剂交给了你。',
    updatedAt: mockTimeline.bromInteractionAt,
  },
  {
    questId: mockIds.quests.main,
    status: 'active',
    note: '找到秘库中继后，莱拉推动了主线路线继续向前。',
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.hidden,
    status: 'locked',
    note: '隐藏任务仍未满足揭露条件，日志保留待后续判定。',
    updatedAt: mockTimeline.archiveEventAt,
  },
];
