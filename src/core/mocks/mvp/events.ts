import type { EventDirectorState, EventLogEntry, WorldEvent } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockWorldEvents: WorldEvent[] = [
  {
    id: mockIds.events.ashfallWarning,
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
    id: mockIds.events.archiveEchoes,
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
      setWorldFlags: ['archiveEchoSeen'],
      startQuestIds: [mockIds.quests.sideArchive],
    },
    repeatable: false,
  },
  {
    id: mockIds.events.wardenCountermeasure,
    title: '守卫反制',
    description: '圣所会对鲁莽行动作出反应，启动一轮防御清扫。',
    triggerConditions: [
      {
        type: 'playerModel',
        requiredAreaId: mockIds.areas.sanctum,
        requiredPlayerTag: 'risky',
      },
    ],
    effects: {
      setWorldFlags: ['wardenAlertRaised'],
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
  worldTension: 68,
  pacingNote: '等秘库路线稳定后，圣所线的压力应该继续升级。',
  randomnessDisabled: false,
};
