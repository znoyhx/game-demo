import type { EventDirectorState, EventLogEntry, WorldEvent } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockWorldEvents: WorldEvent[] = [
  {
    id: mockIds.events.ashfallWarning,
    title: 'Ashfall Warning',
    description: 'The crossroads watch sounds a warning as hot ash starts to drift down.',
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
    title: 'Archive Echoes',
    description: 'The sealed records murmur back when the relay core is nearby.',
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
    title: 'Warden Countermeasure',
    description: 'The sanctum reacts to reckless movement by activating a defensive sweep.',
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
  pacingNote: 'The sanctum arc should escalate after the archive route stabilizes.',
  randomnessDisabled: false,
};
