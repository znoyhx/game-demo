import type { EventDirectorState, EventLogEntry, WorldEvent } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockWorldEvents: WorldEvent[] = [
  {
    id: mockIds.events.ashfallWarning,
    type: 'weather-change',
    title: '灰烬预警',
    description: '当灼热灰烬开始飘落时，路口哨塔发出了警报。',
    triggerConditions: [
      {
        type: 'location',
        requiredAreaId: mockIds.areas.crossroads,
        requiredWorldFlag: 'tutorialCompleted',
      },
    ],
    effects: {
      setWorldFlags: ['ashfallWarningSeen'],
      setWeather: '灰烬飘降',
      updateNpcTrust: [
        {
          npcId: mockIds.npcs.lyra,
          delta: 2,
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.supplyShortfall,
    type: 'resource-reduction',
    title: '补给短缺',
    description: '前哨补给线被切断，库存只能优先供给一线守军。',
    triggerConditions: [
      {
        type: 'time',
        requiredAreaId: mockIds.areas.crossroads,
        requiredTimeOfDay: '暮色将尽',
        minimumWorldTension: 40,
      },
    ],
    effects: {
      setWorldFlags: ['supplyShortageActive'],
      reduceResources: [
        {
          areaId: mockIds.areas.crossroads,
          resourceNodeId: 'resource-node:crossroads-supply-cache',
          amount: 1,
          minimumRemaining: 0,
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.marketPanic,
    type: 'shop-price-change',
    title: '集市恐慌',
    description: '传闻灰潮逼近后，商队开始抬高前哨补给价格以保库存。',
    triggerConditions: [
      {
        type: 'balance',
        requiredAreaId: mockIds.areas.crossroads,
        requiredWorldFlag: 'ashfallWarningSeen',
        minimumWorldTension: 55,
      },
    ],
    effects: {
      setWorldFlags: ['marketPanicActive'],
      setShopPriceModifiers: [
        {
          npcId: mockIds.npcs.brom,
          multiplier: 1.25,
          reason: '灰潮逼近，布罗姆需要优先保住前线库存。',
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.patrolRedeployment,
    type: 'npc-movement',
    title: '巡防改道',
    description: '罗文队长将巡防队改派到前哨，以稳住更脆弱的入口线。',
    triggerConditions: [
      {
        type: 'relationship',
        requiredAreaId: mockIds.areas.archive,
        requiredQuestId: mockIds.quests.sidePatrol,
        requiredQuestStatus: 'active',
        requiredNpcId: mockIds.npcs.rowan,
        requiredNpcTrustAtLeast: 15,
      },
    ],
    effects: {
      setWorldFlags: ['rowanRedeployed'],
      moveNpcs: [
        {
          npcId: mockIds.npcs.rowan,
          toAreaId: mockIds.areas.crossroads,
          x: 9,
          y: 6,
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.archiveEchoes,
    type: 'hidden-clue-exposure',
    title: '秘库回响',
    description: '当中继核心靠近时，被封存的记录会低声回应。',
    triggerConditions: [
      {
        type: 'quest',
        requiredAreaId: mockIds.areas.archive,
        requiredQuestId: mockIds.quests.main,
      },
    ],
    effects: {
      setWorldFlags: ['archiveEchoSeen', 'forbiddenChantExposed'],
      startQuestIds: [mockIds.quests.sideArchive],
      revealClues: [
        {
          clueId: 'clue:forbidden-chant',
          label: '禁咏残篇',
          description: '秘库回响暴露了一段可用于撕开圣所封印的禁咏残篇。',
          areaId: mockIds.areas.archive,
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.borderSkirmish,
    type: 'faction-conflict',
    title: '边界冲突',
    description: '守望者与烬缚议庭在秘库外围爆发试探性交火。',
    triggerConditions: [
      {
        type: 'balance',
        requiredAreaId: mockIds.areas.archive,
        minimumWorldTension: 60,
      },
    ],
    effects: {
      setWorldFlags: ['borderSkirmishActive'],
      setFactionStances: [
        {
          factionId: mockIds.factions.wardens,
          stance: 'friendly',
        },
        {
          factionId: mockIds.factions.ashbound,
          stance: 'hostile',
        },
      ],
      registerFactionConflicts: [
        {
          conflictId: 'conflict:archive-borderline',
          label: '秘库外围遭遇战',
          sourceFactionId: mockIds.factions.ashbound,
          targetFactionId: mockIds.factions.wardens,
          intensity: 72,
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.earlyBossSighted,
    type: 'early-boss-appearance',
    title: '守卫提前现身',
    description: '灰烬守卫提前离开圣所深处，在秘库外环投下压迫性的影子。',
    triggerConditions: [
      {
        type: 'playerModel',
        requiredAreaId: mockIds.areas.archive,
        requiredPlayerTag: 'risky',
        minimumWorldTension: 55,
      },
    ],
    effects: {
      setWorldFlags: ['ashWardenSighted'],
      bossAppearances: [
        {
          npcId: mockIds.npcs.ashWarden,
          areaId: mockIds.areas.archive,
          note: '灰烬守卫提前压到秘库外环，逼迫玩家改变路线。',
        },
      ],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.wardenCountermeasure,
    type: 'area-state-change',
    title: '守卫反制',
    description: '圣所会对鲁莽行动作出反应，启动一轮防御清扫并封锁周边路线。',
    triggerConditions: [
      {
        type: 'playerModel',
        requiredAreaId: mockIds.areas.sanctum,
        requiredPlayerTag: 'risky',
      },
    ],
    effects: {
      setWorldFlags: ['wardenAlertRaised', 'sanctumLockdownActive'],
      unlockAreaIds: [mockIds.areas.sanctum],
      lockAreaIds: [mockIds.areas.grotto],
      updateNpcTrust: [
        {
          npcId: mockIds.npcs.rowan,
          delta: -2,
        },
      ],
    },
    repeatable: true,
  },
];

export const mockEventHistory: EventLogEntry[] = [
  {
    eventId: mockIds.events.ashfallWarning,
    triggeredAt: mockTimeline.lyraInteractionAt,
    source: 'location',
  },
  {
    eventId: mockIds.events.archiveEchoes,
    triggeredAt: mockTimeline.archiveEventAt,
    source: 'quest',
  },
];

export const mockEventDirectorState: EventDirectorState = {
  pendingEventIds: [mockIds.events.wardenCountermeasure],
  scheduledEvents: [
    {
      eventId: mockIds.events.marketPanic,
      scheduledBy: 'game-master',
      reason: '当前张力已逼近前哨市场承压阈值，应准备补给抬价。',
    },
  ],
  worldTension: 68,
  pacingNote: '先稳住秘库回响，再把圣所线的压力往前推一拍。',
  randomnessDisabled: false,
  revealedClues: [
    {
      clueId: 'clue:forbidden-chant',
      label: '禁咏残篇',
      description: '秘库回响暴露了一段可用于撕开圣所封印的禁咏残篇。',
      areaId: mockIds.areas.archive,
      sourceEventId: mockIds.events.archiveEchoes,
      revealedAt: mockTimeline.archiveEventAt,
    },
  ],
  shopPriceModifiers: [],
  factionConflicts: [],
};
