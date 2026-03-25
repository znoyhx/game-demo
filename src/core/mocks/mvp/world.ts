import type { World } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockWorld: World = {
  summary: {
    id: mockIds.world,
    name: '烬陨镇',
    subtitle: '一座围绕封印圣所建立、正在衰败的边境城镇',
    theme: '灰烬前线',
    tone: 'mysterious',
    mode: 'hybrid',
    createdAt: mockTimeline.worldCreatedAt,
  },
  factions: [
    {
      id: mockIds.factions.wardens,
      name: '灰烬守望者',
      description: '守护道路与遗火的边镇秩序组织。',
      stance: 'friendly',
    },
    {
      id: mockIds.factions.ashbound,
      name: '烬缚议庭',
      description: '妄图让圣所之火吞没整片山谷的狂热派。',
      stance: 'hostile',
    },
  ],
  areaIds: [
    mockIds.areas.crossroads,
    mockIds.areas.archive,
    mockIds.areas.sanctum,
    mockIds.areas.grotto,
  ],
  startingAreaId: mockIds.areas.crossroads,
  weather: '灰风',
  timeOfDay: '暮色将尽',
  flags: {
    tutorialCompleted: true,
    ashfallWarningSeen: true,
    supplyShortageActive: false,
    marketPanicActive: false,
    archiveDoorOpened: true,
    bromSupplyDelivered: true,
    archiveEchoSeen: true,
    forbiddenChantExposed: true,
    sanctumSealBroken: false,
    rowanPatrolSecured: false,
    rowanRedeployed: false,
    borderSkirmishActive: false,
    ashWardenSighted: false,
    wardenAlertRaised: false,
    sanctumLockdownActive: false,
  },
};
