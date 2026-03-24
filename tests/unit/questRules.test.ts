import { describe, expect, it } from 'vitest';

import {
  mockIds,
  mockNpcStates,
  mockQuestDefinitions,
  mockQuestProgress,
  mockTimeline,
  mockWorld,
} from '../../src/core/mocks';
import { applyQuestTrigger, evaluateQuestAvailability } from '../../src/core/rules';

describe('quest rules', () => {
  it('keeps the hidden quest locked until its dependency and trust gate are both satisfied', () => {
    const definition = mockQuestDefinitions.find(
      (quest) => quest.id === mockIds.quests.hidden,
    )!;

    const lockedResult = evaluateQuestAvailability({
      definition,
      progress: mockQuestProgress.find((progress) => progress.questId === definition.id),
      questProgressEntries: mockQuestProgress,
      worldFlags: mockWorld.flags,
      currentAreaId: mockIds.areas.archive,
      visitedAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
      npcStatesById: Object.fromEntries(
        mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
      ),
      now: mockTimeline.archiveEventAt,
    });

    expect(lockedResult.ok).toBe(false);
    expect(lockedResult.status).toBe('locked');

    const unlockedResult = evaluateQuestAvailability({
      definition,
      progress: {
        questId: definition.id,
        status: 'locked',
        currentObjectiveIndex: 0,
        completedObjectiveIds: [],
        updatedAt: mockTimeline.archiveEventAt,
      },
      questProgressEntries: mockQuestProgress.map((progress) =>
        progress.questId === mockIds.quests.sideArchive
          ? {
              ...progress,
              status: 'completed',
              currentObjectiveIndex: 2,
              completedObjectiveIds: [
                'condition:archive-inspect-plinth',
                'condition:archive-report-mirel',
              ],
            }
          : progress,
      ),
      worldFlags: mockWorld.flags,
      currentAreaId: mockIds.areas.archive,
      visitedAreaIds: [mockIds.areas.crossroads, mockIds.areas.archive],
      npcStatesById: {
        ...Object.fromEntries(
          mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
        ),
        [mockIds.npcs.mirel]: {
          ...mockNpcStates.find((npcState) => npcState.npcId === mockIds.npcs.mirel)!,
          trust: 35,
        },
      },
      now: mockTimeline.archiveEventAt,
    });

    expect(unlockedResult.ok).toBe(true);
    expect(unlockedResult.status).toBe('available');
  });

  it('applies the selected quest branch when the main quest reaches its final step', () => {
    const definition = mockQuestDefinitions.find((quest) => quest.id === mockIds.quests.main)!;
    const progress = {
      ...mockQuestProgress.find((entry) => entry.questId === mockIds.quests.main)!,
      currentObjectiveIndex: 3,
      completedObjectiveIds: [
        'condition:main-brief-lyra',
        'condition:main-recover-relay-core',
        'condition:main-open-sanctum',
      ],
    };

    const result = applyQuestTrigger(
      definition,
      progress,
      {
        type: 'battle',
        targetId: mockIds.encounter,
        note: '灰烬守卫已被击退，主线进入结算。',
      },
      mockTimeline.combatResolvedAt,
      'branch:main-trust-rowan',
      {
        questProgressEntries: mockQuestProgress,
        worldFlags: mockWorld.flags,
        npcStatesById: Object.fromEntries(
          mockNpcStates.map((npcState) => [npcState.npcId, npcState]),
        ),
      },
    );

    expect(result.ok).toBe(true);
    expect(result.progress.status).toBe('completed');
    expect(result.branchResult?.id).toBe('branch:main-trust-rowan');
    expect(result.reward.worldFlags).toContain('rowanPatrolSecured');
    expect(result.relationChanges).toEqual([
      {
        npcId: mockIds.npcs.rowan,
        delta: 10,
      },
    ]);
  });

  it('keeps direct-trigger quest steps blocked when the trigger does not match the active step', () => {
    const definition = mockQuestDefinitions.find((quest) => quest.id === mockIds.quests.main)!;
    const progress = mockQuestProgress.find((entry) => entry.questId === mockIds.quests.main)!;

    const result = applyQuestTrigger(
      definition,
      progress,
      {
        type: 'talk',
        targetId: mockIds.npcs.rowan,
        note: '错误的角色对话不应推进主线。',
      },
      mockTimeline.saveUpdatedAt,
      progress.chosenBranchId,
      {
        questProgressEntries: mockQuestProgress,
        worldFlags: mockWorld.flags,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.progress.currentObjectiveIndex).toBe(progress.currentObjectiveIndex);
  });
});
