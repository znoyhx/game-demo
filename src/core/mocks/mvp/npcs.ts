import type { NpcDefinition, NpcState } from '../../schemas';

import { mockIds, mockTimeline } from './constants';

export const mockNpcDefinitions: NpcDefinition[] = [
  {
    id: mockIds.npcs.lyra,
    name: 'Lyra Emberwatch',
    role: 'guide',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.crossroads,
    personalityTags: ['steady', 'protective', 'strategic'],
    baseDisposition: 'friendly',
    avatarKey: 'avatar-lyra',
  },
  {
    id: mockIds.npcs.brom,
    name: 'Brom Coilhand',
    role: 'merchant',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.crossroads,
    personalityTags: ['practical', 'dry-humored'],
    baseDisposition: 'neutral',
    avatarKey: 'avatar-brom',
  },
  {
    id: mockIds.npcs.mirel,
    name: 'Mirel Scribe',
    role: 'scholar',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.archive,
    personalityTags: ['curious', 'careful'],
    baseDisposition: 'neutral',
    avatarKey: 'avatar-mirel',
  },
  {
    id: mockIds.npcs.rowan,
    name: 'Captain Rowan',
    role: 'guard',
    factionId: mockIds.factions.wardens,
    areaId: mockIds.areas.archive,
    personalityTags: ['disciplined', 'blunt'],
    baseDisposition: 'suspicious',
    avatarKey: 'avatar-rowan',
  },
  {
    id: mockIds.npcs.ashWarden,
    name: 'The Ash Warden',
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
    memory: {
      shortTerm: ['The player mapped the archive entry hall.'],
      longTerm: ['The player agreed to help Lyra rekindle the ward.'],
      lastInteractionAt: mockTimeline.lyraInteractionAt,
    },
    revealableInfo: {
      publicFacts: ['Lyra commands the crossroads watch.'],
      trustGatedFacts: [
        {
          minTrust: 40,
          fact: 'Lyra believes the sanctum seal can be opened from the archive below.',
        },
      ],
      hiddenSecrets: ['Lyra failed to stop the previous Ash Warden incursion.'],
    },
    currentGoal: 'Open a stable route into the sanctum.',
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
    memory: {
      shortTerm: ['The player returned the herb pack for the tonic order.'],
      longTerm: ['Brom now sees the player as reliable under pressure.'],
      lastInteractionAt: mockTimeline.bromInteractionAt,
    },
    revealableInfo: {
      publicFacts: ['Brom runs the last stable supply stall in town.'],
      trustGatedFacts: [
        {
          minTrust: 25,
          fact: 'Brom keeps an emergency tonic cache for the wardens.',
        },
      ],
      hiddenSecrets: ['Brom once smuggled sanctum keys to survive a famine year.'],
    },
    currentGoal: 'Keep supply lines open before the next ash surge.',
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
    memory: {
      shortTerm: ['The player helped recover two intact record tablets.'],
      longTerm: ['Mirel suspects the archive reacts to spoken names.'],
      lastInteractionAt: mockTimeline.archiveEventAt,
    },
    revealableInfo: {
      publicFacts: ['Mirel studies ember-era records beneath the town.'],
      trustGatedFacts: [
        {
          minTrust: 20,
          fact: 'Mirel found references to a counter-ritual hidden near the sanctum gate.',
        },
      ],
      hiddenSecrets: ['Mirel once copied a banned ashbound chant for research.'],
    },
    currentGoal: 'Finish cataloguing the living records before they collapse.',
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
    memory: {
      shortTerm: ['The player entered the archive without breaking patrol protocol.'],
      longTerm: ['Rowan believes the player could help hold the southern gate.'],
      lastInteractionAt: mockTimeline.archiveEventAt,
    },
    revealableInfo: {
      publicFacts: ['Rowan commands the archive perimeter patrol.'],
      trustGatedFacts: [
        {
          minTrust: 15,
          fact: 'Rowan lost two sentries when the Ash Warden tested the seal last month.',
        },
      ],
      hiddenSecrets: ['Rowan intends to abandon the archive if the ward fails again.'],
    },
    currentGoal: 'Keep the archive corridor from collapsing into a kill zone.',
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
    memory: {
      shortTerm: ['The player has broken into the lower sanctum approach.'],
      longTerm: ['The Ash Warden marks all wardens as oathbreakers.'],
    },
    revealableInfo: {
      publicFacts: ['The Ash Warden defends the sanctum with ritual tactics.'],
      trustGatedFacts: [],
      hiddenSecrets: ['Its second phase draws strength from the broken archive wards.'],
    },
    currentGoal: 'Burn out the ward line and reclaim the valley.',
    hasGivenQuestIds: [],
    flags: {
      bossAwake: true,
    },
  },
];
