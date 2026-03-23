import type { QuestDefinition, QuestProgress } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockQuestDefinitions: QuestDefinition[] = [
  {
    id: mockIds.quests.main,
    type: 'main',
    title: 'Rekindle the Ward',
    description: 'Restore the archive relay and open the way into the Ember Sanctum.',
    giverNpcId: mockIds.npcs.lyra,
    unlockCondition: {
      requiredWorldFlags: ['tutorialCompleted'],
    },
    objectives: [
      {
        id: 'objective:main-brief-lyra',
        label: 'Receive Lyra\'s briefing at the crossroads',
        type: 'talk',
        targetId: mockIds.npcs.lyra,
      },
      {
        id: 'objective:main-recover-relay-core',
        label: 'Recover the relay core from the Sunken Archive',
        type: 'collect',
        targetId: 'item:relay-core',
        requiredCount: 1,
      },
      {
        id: 'objective:main-open-sanctum',
        label: 'Break the sanctum seal',
        type: 'trigger',
        targetId: 'flag:sanctumSealBroken',
      },
      {
        id: 'objective:main-defeat-warden',
        label: 'Defeat the Ash Warden',
        type: 'battle',
        targetId: mockIds.encounter,
      },
    ],
    reward: {
      exp: 120,
      gold: 90,
      worldFlags: ['sanctumSealBroken'],
    },
    failureCondition: 'The archive relay collapses before the sanctum can be reached.',
    branchResults: [
      {
        id: 'branch:main-trust-rowan',
        label: 'Secure Rowan\'s patrol support',
        description: 'The archive route becomes safer, but the boss prepares earlier.',
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
    title: 'Brew Cinder Tonic',
    description: 'Help Brom restock his ember tonic before the next ash wind.',
    giverNpcId: mockIds.npcs.brom,
    objectives: [
      {
        id: 'objective:supply-gather-herbs',
        label: 'Gather dusk herbs from the archive edge',
        type: 'collect',
        targetId: 'item:dusk-herb',
        requiredCount: 3,
      },
      {
        id: 'objective:supply-return-brom',
        label: 'Return the herbs to Brom',
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
    title: 'Catalogue Archive Echoes',
    description: 'Assist Mirel in logging the whispers that react to the ward line.',
    giverNpcId: mockIds.npcs.mirel,
    unlockCondition: {
      requiredQuestIds: [mockIds.quests.main],
    },
    objectives: [
      {
        id: 'objective:archive-inspect-plinth',
        label: 'Inspect the speaking plinth',
        type: 'visit',
        targetId: 'point:speaking-plinth',
      },
      {
        id: 'objective:archive-report-mirel',
        label: 'Report the echo pattern back to Mirel',
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
    title: 'Hold the South Gate',
    description: 'Help Rowan secure the archive approach before the Ash Warden reacts.',
    giverNpcId: mockIds.npcs.rowan,
    objectives: [
      {
        id: 'objective:patrol-check-barrier',
        label: 'Inspect the south barrier',
        type: 'visit',
        targetId: 'point:south-barrier',
      },
      {
        id: 'objective:patrol-report-rowan',
        label: 'Return to Rowan with the patrol report',
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
