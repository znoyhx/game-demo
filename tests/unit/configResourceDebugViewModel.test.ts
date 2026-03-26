import { describe, expect, it } from 'vitest';

import { mockAreas, mockGameConfig, mockNpcDefinitions, mockResourceState } from '../../src/core/mocks/mvp';
import { buildConfigResourceDebugViewModel } from '../../src/pages/Debug/configResourceDebugViewModel';

describe('config resource debug view model', () => {
  it('summarizes runtime profile, registry counts, and current-area hit or miss state', () => {
    const archiveArea = mockAreas.find((area) => area.id === 'area:sunken-archive');

    if (!archiveArea) {
      throw new Error('Expected archive area fixture to exist.');
    }

    const viewModel = buildConfigResourceDebugViewModel({
      gameConfig: {
        ...mockGameConfig,
        devModeEnabled: false,
        presentationModeEnabled: true,
      },
      resourceState: structuredClone(mockResourceState),
      currentArea: archiveArea,
      npcDefinitions: mockNpcDefinitions,
    });

    expect(viewModel.configSummary.activeProfileLabel).toContain('演示');
    expect(viewModel.configSummary.autosaveLabel).toContain('自动保存');
    expect(
      viewModel.registryMetrics.find((metric) => metric.label === '背景注册数量')?.value,
    ).toBe('4 项');
    expect(
      viewModel.registryMetrics.find((metric) => metric.label === '头像注册数量')?.value,
    ).toBe('2 项');
    expect(
      viewModel.registryMetrics.find((metric) => metric.label === '当前区域命中率')?.value,
    ).toBe('1/3');
    expect(viewModel.currentAreaEntries[0]?.registryHit).toBe(true);
    expect(viewModel.currentAreaEntries.some((entry) => !entry.registryHit)).toBe(true);
    expect(viewModel.resourceSummary.selectedBackgroundLabel).not.toBe(
      mockResourceState.selectedBackgroundKey,
    );
  });
});
