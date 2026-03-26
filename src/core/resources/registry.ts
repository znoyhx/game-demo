import {
  type CombatEncounterDefinition,
  type QuestDefinition,
  type ResourceDefinition,
  type WorldEvent,
  combatEncounterDefinitionSchema,
  questDefinitionSchema,
  resourceDefinitionSchema,
  worldEventSchema,
} from '../schemas';
import {
  mockBossEncounterDefinition,
  mockQuestDefinitions,
  mockResourceState,
  mockWorldEvents,
} from '../mocks';

const buildResourceDefinition = (
  definition: ResourceDefinition,
): ResourceDefinition => resourceDefinitionSchema.parse(definition);

const buildEncounterDefinition = (
  definition: CombatEncounterDefinition,
): CombatEncounterDefinition => combatEncounterDefinitionSchema.parse(definition);

const buildEventDefinition = (definition: WorldEvent): WorldEvent =>
  worldEventSchema.parse(definition);

const buildQuestTemplate = (definition: QuestDefinition): QuestDefinition =>
  questDefinitionSchema.parse(definition);

const indexBy = <T,>(
  items: T[],
  getKey: (item: T) => string | undefined,
): Record<string, T> =>
  items.reduce<Record<string, T>>((registry, item) => {
    const key = getKey(item);

    if (!key) {
      return registry;
    }

    registry[key] = item;
    return registry;
  }, {});

const backgroundEntries = mockResourceState.entries
  .filter(
    (entry): entry is ResourceDefinition & { areaId: string } =>
      entry.kind === 'background' && Boolean(entry.areaId),
  )
  .map((entry) => buildResourceDefinition(entry));

const avatarEntries = mockResourceState.entries
  .filter(
    (entry): entry is ResourceDefinition & { npcId: string } =>
      entry.kind === 'avatar' && Boolean(entry.npcId),
  )
  .map((entry) => buildResourceDefinition(entry));

const encounterEntries = [buildEncounterDefinition(mockBossEncounterDefinition)];
const eventEntries = mockWorldEvents.map((entry) => buildEventDefinition(entry));
const questTemplateEntries = mockQuestDefinitions.map((entry) =>
  buildQuestTemplate(entry),
);

export const areaBackgroundRegistry = Object.freeze(
  indexBy(backgroundEntries, (entry) => entry.areaId),
) as Readonly<Record<string, ResourceDefinition>>;

export const avatarRegistry = Object.freeze(
  indexBy(avatarEntries, (entry) => entry.npcId),
) as Readonly<Record<string, ResourceDefinition>>;

export const encounterDefinitionRegistry = Object.freeze(
  indexBy(encounterEntries, (entry) => entry.id),
) as Readonly<Record<string, CombatEncounterDefinition>>;

export const eventDefinitionRegistry = Object.freeze(
  indexBy(eventEntries, (entry) => entry.id),
) as Readonly<Record<string, WorldEvent>>;

export const questTemplateRegistry = Object.freeze(
  indexBy(questTemplateEntries, (entry) => entry.id),
) as Readonly<Record<string, QuestDefinition>>;

export const findAreaBackgroundResource = (areaId: string) =>
  areaBackgroundRegistry[areaId] ?? null;

export const findAvatarResource = (npcId: string) =>
  avatarRegistry[npcId] ?? null;

export const findEncounterDefinition = (encounterId: string) =>
  encounterDefinitionRegistry[encounterId] ?? null;

export const findEventDefinition = (eventId: string) =>
  eventDefinitionRegistry[eventId] ?? null;

export const findQuestTemplate = (questId: string) =>
  questTemplateRegistry[questId] ?? null;

export const listAreaBackgroundResources = () =>
  Object.values(areaBackgroundRegistry);

export const listAvatarResources = () => Object.values(avatarRegistry);

export const listEncounterDefinitions = () =>
  Object.values(encounterDefinitionRegistry);

export const listEventDefinitions = () => Object.values(eventDefinitionRegistry);

export const listQuestTemplates = () => Object.values(questTemplateRegistry);
