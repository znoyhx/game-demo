import type { NpcDefinition, NpcState } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockNpcDefinitions: NpcDefinition[] = [
  {
    id: mockIds.npcs.lyra,
    name: '莱拉·烬望',
    identity: '守望者前线引导官',
    role: 'guide',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.crossroads,
    personalityTags: ['steady', 'protective', 'strategic'],
    baseDisposition: 'friendly',
    avatarKey: 'avatar-lyra',
  },
  {
    id: mockIds.npcs.brom,
    name: '布罗姆·线匠',
    identity: '前线补给商与修理匠',
    role: 'merchant',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.crossroads,
    personalityTags: ['practical', 'dry-humored'],
    baseDisposition: 'neutral',
    avatarKey: 'avatar-brom',
  },
  {
    id: mockIds.npcs.mirel,
    name: '米蕾尔·书记',
    identity: '沉没秘库编目学者',
    role: 'scholar',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.archive,
    personalityTags: ['curious', 'careful'],
    baseDisposition: 'neutral',
    avatarKey: 'avatar-mirel',
  },
  {
    id: mockIds.npcs.rowan,
    name: '罗文队长',
    identity: '秘库外环巡防队长',
    role: 'guard',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.archive,
    personalityTags: ['disciplined', 'blunt'],
    baseDisposition: 'suspicious',
    avatarKey: 'avatar-rowan',
  },
  {
    id: mockIds.npcs.ashWarden,
    name: '灰烬守卫',
    identity: '圣所封印的仪式守卫',
    role: 'boss',
    factionId: mockIds.factions.ashbound,
    areaId: mockIds.areas.sanctum,
    personalityTags: ['unyielding', 'ritual-bound'],
    baseDisposition: 'hostile',
    avatarKey: 'avatar-ash-warden',
  },
];

export const mockNpcStates: NpcState[] = [
  {
    npcId: mockIds.npcs.lyra,
    relationship: 36,
    trust: 48,
    currentDisposition: 'friendly',
    emotionalState: 'resolute',
    memory: {
      shortTerm: ['玩家已经勘察过秘库入口大厅。'],
      longTerm: ['玩家答应帮助莱拉重燃守护火线。'],
      lastInteractionAt: mockTimeline.lyraInteractionAt,
    },
    revealableInfo: {
      publicFacts: ['莱拉负责指挥路口哨戒队。'],
      trustGatedFacts: [
        {
          minTrust: 40,
          fact: '莱拉相信可以从下层秘库打开圣所封印。',
        },
      ],
      hiddenSecrets: ['莱拉曾没能阻止上一轮灰烬守卫的入侵。'],
    },
    revealedFacts: ['莱拉负责指挥路口哨戒队。'],
    revealedSecrets: [],
    relationshipNetwork: [
      {
        targetNpcId: mockIds.npcs.rowan,
        bond: '协防盟友',
        strength: 42,
      },
      {
        targetNpcId: mockIds.npcs.brom,
        bond: '补给协调',
        strength: 28,
      },
    ],
    currentGoal: '打开一条通往圣所的稳定路线。',
    hasGivenQuestIds: [mockIds.quests.main],
    flags: {
      metPlayer: true,
      sharedSealTheory: true,
    },
  },
  {
    npcId: mockIds.npcs.brom,
    relationship: 18,
    trust: 28,
    currentDisposition: 'neutral',
    emotionalState: 'calm',
    memory: {
      shortTerm: ['玩家已经把药剂订单需要的草药包送回来了。'],
      longTerm: ['布罗姆现在认为玩家在压力下也值得信赖。'],
      lastInteractionAt: mockTimeline.bromInteractionAt,
    },
    revealableInfo: {
      publicFacts: ['布罗姆经营着镇上最后一个稳定的补给摊位。'],
      trustGatedFacts: [
        {
          minTrust: 25,
          fact: '布罗姆为守望者们留着一批紧急药剂储备。',
        },
      ],
      hiddenSecrets: ['布罗姆曾在饥荒那年靠偷运圣所钥匙活下来。'],
    },
    revealedFacts: ['布罗姆经营着镇上最后一个稳定的补给摊位。'],
    revealedSecrets: [],
    relationshipNetwork: [
      {
        targetNpcId: mockIds.npcs.lyra,
        bond: '补给协作',
        strength: 26,
      },
    ],
    currentGoal: '在下一次灰潮到来前维持补给线畅通。',
    hasGivenQuestIds: [mockIds.quests.sideSupply],
    flags: {
      tonicDelivered: true,
    },
  },
  {
    npcId: mockIds.npcs.mirel,
    relationship: 14,
    trust: 22,
    currentDisposition: 'neutral',
    emotionalState: 'wary',
    memory: {
      shortTerm: ['玩家帮她找回了两块完好的记录石板。'],
      longTerm: ['米蕾尔怀疑秘库会对被说出的名字产生反应。'],
      lastInteractionAt: mockTimeline.archiveEventAt,
    },
    revealableInfo: {
      publicFacts: ['米蕾尔在镇子下方研究余烬时代的记录。'],
      trustGatedFacts: [
        {
          minTrust: 20,
          fact: '米蕾尔发现圣所门口附近藏有一段反制仪式的记载。',
        },
      ],
      hiddenSecrets: ['米蕾尔曾为了研究抄录过一段被禁的灰缚咏唱。'],
    },
    revealedFacts: [],
    revealedSecrets: [],
    relationshipNetwork: [
      {
        targetNpcId: mockIds.npcs.rowan,
        bond: '情报往来',
        strength: 12,
      },
    ],
    currentGoal: '在这些活体记录彻底崩塌前完成编目。',
    hasGivenQuestIds: [mockIds.quests.sideArchive],
    flags: {
      archiveSurveyStarted: true,
    },
  },
  {
    npcId: mockIds.npcs.rowan,
    relationship: 8,
    trust: 16,
    currentDisposition: 'suspicious',
    emotionalState: 'tense',
    memory: {
      shortTerm: ['玩家进入秘库时并没有破坏巡逻规程。'],
      longTerm: ['罗文认为玩家也许能帮忙守住南侧关口。'],
      lastInteractionAt: mockTimeline.archiveEventAt,
    },
    revealableInfo: {
      publicFacts: ['罗文负责秘库外围巡逻。'],
      trustGatedFacts: [
        {
          minTrust: 15,
          fact: '上个月灰烬守卫试探封印时，罗文失去了两名哨兵。',
        },
      ],
      hiddenSecrets: ['如果守护火线再次失守，罗文打算放弃秘库。'],
    },
    revealedFacts: [],
    revealedSecrets: [],
    relationshipNetwork: [
      {
        targetNpcId: mockIds.npcs.lyra,
        bond: '前线联防',
        strength: 36,
      },
      {
        targetNpcId: mockIds.npcs.mirel,
        bond: '情报共享',
        strength: 10,
      },
    ],
    currentGoal: '避免秘库通道彻底塌成一片死亡地带。',
    hasGivenQuestIds: [mockIds.quests.sidePatrol],
    flags: {
      patrolRouteShared: false,
    },
  },
  {
    npcId: mockIds.npcs.ashWarden,
    relationship: -80,
    trust: 0,
    currentDisposition: 'hostile',
    emotionalState: 'angry',
    memory: {
      shortTerm: ['玩家已经闯入了圣所下层通路。'],
      longTerm: ['灰烬守卫将所有守望者都视为背誓者。'],
    },
    revealableInfo: {
      publicFacts: ['灰烬守卫以仪式化战术保卫圣所。'],
      trustGatedFacts: [],
      hiddenSecrets: ['它的第二阶段会从破碎的秘库守护中汲取力量。'],
    },
    revealedFacts: [],
    revealedSecrets: [],
    relationshipNetwork: [
      {
        targetNpcId: mockIds.npcs.lyra,
        bond: '宿敌',
        strength: -85,
      },
    ],
    currentGoal: '烧毁守护火线，重新夺回整片山谷。',
    hasGivenQuestIds: [],
    flags: {
      bossAwake: true,
    },
  },
];
