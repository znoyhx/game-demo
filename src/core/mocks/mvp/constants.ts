export const MOCK_SCHEMA_VERSION = '0.4.0';

export const mockTimeline = {
  worldCreatedAt: '2026-03-23T00:00:00.000Z',
  sessionStartedAt: '2026-03-23T00:02:00.000Z',
  lyraInteractionAt: '2026-03-23T00:08:00.000Z',
  bromInteractionAt: '2026-03-23T00:09:00.000Z',
  archiveEventAt: '2026-03-23T00:12:00.000Z',
  playerModelUpdatedAt: '2026-03-23T00:16:00.000Z',
  saveCreatedAt: '2026-03-23T00:18:00.000Z',
  saveUpdatedAt: '2026-03-23T00:21:00.000Z',
  reviewGeneratedAt: '2026-03-23T00:25:00.000Z',
  combatResolvedAt: '2026-03-23T00:26:00.000Z',
  sessionLastActiveAt: '2026-03-23T00:27:00.000Z',
} as const;

export const mockIds = {
  world: 'world:emberfall',
  factions: {
    wardens: 'faction:cinder-wardens',
    ashbound: 'faction:ashbound-court',
  },
  areas: {
    crossroads: 'area:cinder-crossroads',
    archive: 'area:sunken-archive',
    sanctum: 'area:ember-sanctum',
    grotto: 'area:ember-grotto',
  },
  npcs: {
    lyra: 'npc:lyra-emberwatch',
    brom: 'npc:brom-coilhand',
    mirel: 'npc:mirel-scribe',
    rowan: 'npc:captain-rowan',
    ashWarden: 'npc:ash-warden',
  },
  quests: {
    tutorial: 'quest:calibrate-the-watchfire',
    main: 'quest:rekindle-the-ward',
    sideSupply: 'quest:brew-cinder-tonic',
    sideArchive: 'quest:catalogue-archive-echoes',
    sidePatrol: 'quest:hold-the-south-gate',
    hidden: 'quest:recover-the-banned-chant',
    dynamic: 'quest:contain-the-countermeasure',
  },
  events: {
    ashfallWarning: 'event:ashfall-warning',
    archiveEchoes: 'event:archive-echoes',
    wardenCountermeasure: 'event:warden-countermeasure',
  },
  encounter: 'encounter:ashen-warden',
  save: 'save:emberfall-slot-1',
} as const;
