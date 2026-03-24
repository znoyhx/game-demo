import type { QuestDefinition, QuestHistoryEntry, QuestProgress } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockQuestDefinitions: QuestDefinition[] = [
  {
    id: mockIds.quests.main,
    type: 'main',
    title: '重燃守护火线',
    description: '修复秘库中继，让通往余烬圣所的道路重新开启。',
    giverNpcId: mockIds.npcs.lyra,
    unlockCondition: {
      requiredWorldFlags: ['tutorialCompleted'],
    },
    objectives: [
      {
        id: 'objective:main-brief-lyra',
        label: '在路口听取莱拉的简报',
        type: 'talk',
        targetId: mockIds.npcs.lyra,
      },
      {
        id: 'objective:main-recover-relay-core',
        label: '从沉没秘库取回中继核心',
        type: 'collect',
        targetId: 'item:relay-core',
        requiredCount: 1,
      },
      {
        id: 'objective:main-open-sanctum',
        label: '打破圣所封印',
        type: 'trigger',
        targetId: 'flag:sanctumSealBroken',
      },
      {
        id: 'objective:main-defeat-warden',
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
    failureCondition: '若在抵达圣所前秘库中继彻底崩塌，则任务失败。',
    branchResults: [
      {
        id: 'branch:main-trust-rowan',
        label: '争取罗文的巡逻支援',
        description: '秘库路线会更安全，但首领也会更早完成准备。',
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
    ],
  },
  {
    id: mockIds.quests.sideSupply,
    type: 'side',
    title: '调制余烬药剂',
    description: '在下一波灰风到来前，帮布罗姆补齐他的余烬药剂材料。',
    giverNpcId: mockIds.npcs.brom,
    objectives: [
      {
        id: 'objective:supply-gather-herbs',
        label: '在秘库边缘采集暮色草药',
        type: 'collect',
        targetId: 'item:dusk-herb',
        requiredCount: 3,
      },
      {
        id: 'objective:supply-return-brom',
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
  },
  {
    id: mockIds.quests.sideArchive,
    type: 'side',
    title: '记录秘库回响',
    description: '协助米蕾尔记录那些会对守护火线产生反应的低语。',
    giverNpcId: mockIds.npcs.mirel,
    unlockCondition: {
      requiredQuestIds: [mockIds.quests.main],
    },
    objectives: [
      {
        id: 'objective:archive-inspect-plinth',
        label: '检查会说话的石座',
        type: 'visit',
        targetId: 'point:speaking-plinth',
      },
      {
        id: 'objective:archive-report-mirel',
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
  },
  {
    id: mockIds.quests.sidePatrol,
    type: 'side',
    title: '守住南侧关口',
    description: '在灰烬守卫作出反应前，协助罗文稳住通往秘库的入口。',
    giverNpcId: mockIds.npcs.rowan,
    objectives: [
      {
        id: 'objective:patrol-check-barrier',
        label: '检查南侧屏障',
        type: 'visit',
        targetId: 'point:south-barrier',
      },
      {
        id: 'objective:patrol-report-rowan',
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
  },
];

export const mockQuestProgress: QuestProgress[] = [
  {
    questId: mockIds.quests.main,
    status: 'active',
    currentObjectiveIndex: 1,
    completedObjectiveIds: ['objective:main-brief-lyra'],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.sideSupply,
    status: 'completed',
    currentObjectiveIndex: 2,
    completedObjectiveIds: ['objective:supply-gather-herbs', 'objective:supply-return-brom'],
    updatedAt: mockTimeline.bromInteractionAt,
  },
  {
    questId: mockIds.quests.sideArchive,
    status: 'active',
    currentObjectiveIndex: 1,
    completedObjectiveIds: ['objective:archive-inspect-plinth'],
    updatedAt: mockTimeline.archiveEventAt,
  },
  {
    questId: mockIds.quests.sidePatrol,
    status: 'available',
    currentObjectiveIndex: 0,
    completedObjectiveIds: [],
    updatedAt: mockTimeline.archiveEventAt,
  },
];

export const mockQuestHistory: QuestHistoryEntry[] = [
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
];
