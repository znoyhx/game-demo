import type { World } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockWorld: World = {
  summary: {
    id: mockIds.world,
    name: 'Emberfall',
    subtitle: 'A fading frontier built around a sealed sanctum',
    theme: 'cinder frontier',
    tone: 'mysterious',
    mode: 'hybrid',
    createdAt: mockTimeline.worldCreatedAt,
  },
  factions: [
    {
      id: mockIds.factions.wardens,
      name: 'Cinder Wardens',
      description: 'A civic order guarding the roads and relic fires.',
      stance: 'friendly',
    },
    {
      id: mockIds.factions.ashbound,
      name: 'Ashbound Court',
      description: 'Fanatics who want the sanctum fire to consume the valley.',
      stance: 'hostile',
    },
  ],
  areaIds: [mockIds.areas.crossroads, mockIds.areas.archive, mockIds.areas.sanctum],
  startingAreaId: mockIds.areas.crossroads,
  weather: 'ash wind',
  timeOfDay: 'late dusk',
  flags: {
    tutorialCompleted: true,
    ashfallWarningSeen: true,
    archiveDoorOpened: true,
    bromSupplyDelivered: true,
    archiveEchoSeen: true,
    sanctumSealBroken: false,
    rowanPatrolSecured: false,
    wardenAlertRaised: false,
  },
};
