import { describe, expect, it } from 'vitest';

import {
  findWorldCreationTemplate,
  getCombatTuningPreset,
  getDifficultyPreset,
  resolveDebugFeatureFlags,
  resolveGameShellUiSettings,
  resolveSavePolicy,
  shouldAutoLoadLatestSave,
  shouldAutoSaveForReason,
} from '../../src/core/config';
import { mockGameConfig } from '../../src/core/mocks/mvp';

describe('runtime config', () => {
  it('provides validated difficulty and combat presets by difficulty', () => {
    const hardDifficulty = getDifficultyPreset('hard');
    const hardCombat = getCombatTuningPreset('hard');

    expect(hardDifficulty.id).toBe('hard');
    expect(hardDifficulty.initialWorldTension).toBeGreaterThan(
      getDifficultyPreset('easy').initialWorldTension,
    );
    expect(hardCombat.difficulty).toBe('hard');
    expect(hardCombat.baseEnemyHpMultiplier).toBeGreaterThan(
      getCombatTuningPreset('easy').baseEnemyHpMultiplier,
    );
  });

  it('resolves save policies based on mutable runtime config only', () => {
    const standardConfig = {
      ...mockGameConfig,
      devModeEnabled: false,
      presentationModeEnabled: false,
    };
    const presentationConfig = {
      ...mockGameConfig,
      devModeEnabled: false,
      presentationModeEnabled: true,
    };

    expect(resolveSavePolicy(standardConfig).id).toBe('save-policy:standard');
    expect(shouldAutoSaveForReason(standardConfig, 'review-generation')).toBe(true);
    expect(resolveSavePolicy(presentationConfig).id).toBe(
      'save-policy:presentation',
    );
    expect(shouldAutoSaveForReason(presentationConfig, 'review-generation')).toBe(
      false,
    );
    expect(shouldAutoSaveForReason(presentationConfig, 'area-transition')).toBe(true);
    expect(shouldAutoLoadLatestSave(presentationConfig)).toBe(true);
  });

  it('resolves debug and shell UI profiles for presentation mode', () => {
    const presentationConfig = {
      ...mockGameConfig,
      devModeEnabled: false,
      presentationModeEnabled: true,
    };

    const debugFlags = resolveDebugFeatureFlags(presentationConfig);
    const uiSettings = resolveGameShellUiSettings(presentationConfig);

    expect(debugFlags.renderingTools).toBe(false);
    expect(uiSettings.maxVisibleQuests).toBe(3);
    expect(uiSettings.maxLogs).toBe(5);
    expect(uiSettings.maxTips).toBe(5);
  });

  it('finds configured world creation templates from the central registry', () => {
    const template = findWorldCreationTemplate('template:quick-play');

    expect(template).not.toBeNull();
    expect(template?.request.templateId).toBe('template:quick-play');
    expect(template?.request.quickStartEnabled).toBe(true);
  });
});
