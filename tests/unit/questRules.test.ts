import { describe, expect, it } from 'vitest';

import {
  mockIds,
  mockQuestDefinitions,
  mockQuestProgress,
  mockTimeline,
  mockWorld,
} from '../../src/core/mocks';
import { applyQuestTrigger, evaluateQuestAvailability } from '../../src/core/rules';

describe('quest rules', () => {
  it('keeps archive side quest locked until the main quest is completed', () => {
    const definition = mockQuestDefinitions.find(
      (quest) => quest.id === mockIds.quests.sideArchive,
    )!;

    const result = evaluateQuestAvailability({
      definition,
      questProgressEntries: mockQuestProgress,
      worldFlags: mockWorld.flags,
      now: mockTimeline.archiveEventAt,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('locked');
  });

  it('advances the main quest when the active objective matches the trigger', () => {
    const definition = mockQuestDefinitions.find((quest) => quest.id === mockIds.quests.main)!;
    const progress = mockQuestProgress.find((entry) => entry.questId === mockIds.quests.main)!;

    const result = applyQuestTrigger(
      definition,
      progress,
      {
        type: 'collect',
        targetId: 'item:relay-core',
        count: 1,
        note: 'The relay core was recovered from the archive depth.',
      },
      mockTimeline.saveUpdatedAt,
    );

    expect(result.ok).toBe(true);
    expect(result.progress.currentObjectiveIndex).toBe(2);
    expect(result.progress.status).toBe('active');
  });

  it('completes a quest and exposes its reward when the final objective resolves', () => {
    const definition = mockQuestDefinitions.find(
      (quest) => quest.id === mockIds.quests.sideArchive,
    )!;
    const progress = mockQuestProgress.find(
      (entry) => entry.questId === mockIds.quests.sideArchive,
    )!;

    const result = applyQuestTrigger(
      definition,
      progress,
      {
        type: 'talk',
        targetId: mockIds.npcs.mirel,
        note: 'Mirel logged the echo pattern and closed the investigation.',
      },
      mockTimeline.saveUpdatedAt,
    );

    expect(result.ok).toBe(true);
    expect(result.progress.status).toBe('completed');
    expect(result.reward.worldFlags).toContain('archiveEchoSeen');
  });
});
