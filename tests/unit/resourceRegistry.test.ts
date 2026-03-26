import { describe, expect, it } from 'vitest';

import {
  findAreaBackgroundResource,
  findAvatarResource,
  findEncounterDefinition,
  findEventDefinition,
  findQuestTemplate,
  listAreaBackgroundResources,
  listAvatarResources,
  listEventDefinitions,
  listQuestTemplates,
} from '../../src/core/resources';
import { mockIds } from '../../src/core/mocks/mvp';

describe('resource registry', () => {
  it('looks up registered background and avatar resources by domain ids', () => {
    expect(findAreaBackgroundResource(mockIds.areas.archive)?.key).toBe('bg-archive');
    expect(findAvatarResource(mockIds.npcs.lyra)?.key).toBe('avatar-lyra');
  });

  it('looks up registered encounter, event, and quest templates', () => {
    expect(findEncounterDefinition(mockIds.encounter)?.id).toBe(mockIds.encounter);
    expect(findEventDefinition(mockIds.events.archiveEchoes)?.id).toBe(
      mockIds.events.archiveEchoes,
    );
    expect(findQuestTemplate(mockIds.quests.main)?.id).toBe(mockIds.quests.main);
  });

  it('exposes list helpers for event and quest registries', () => {
    expect(listAreaBackgroundResources()).toHaveLength(4);
    expect(listAvatarResources()).toHaveLength(2);
    expect(listEventDefinitions().length).toBeGreaterThanOrEqual(4);
    expect(listQuestTemplates().length).toBeGreaterThanOrEqual(4);
  });
});
