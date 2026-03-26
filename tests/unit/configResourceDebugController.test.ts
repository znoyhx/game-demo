import { describe, expect, it } from 'vitest';

import { ConfigResourceDebugController } from '../../src/core/controllers/configResourceDebugController';
import { mockIds, mockSaveSnapshot } from '../../src/core/mocks/mvp';
import { createGameStore } from '../../src/core/state';

class SaveWriterSpy {
  calls: Array<'auto' | 'manual' | 'debug'> = [];

  async saveNow(source: 'auto' | 'manual' | 'debug') {
    this.calls.push(source);
  }
}

const buildController = () => {
  const store = createGameStore(structuredClone(mockSaveSnapshot));
  const saveWriter = new SaveWriterSpy();
  const controller = new ConfigResourceDebugController({
    store,
    saveController: saveWriter,
  });

  return {
    store,
    saveWriter,
    controller,
  };
};

describe('config resource debug controller', () => {
  it('applies runtime profiles through validated config state and debug saves', async () => {
    const { controller, saveWriter, store } = buildController();

    const nextConfig = await controller.applyRuntimeProfile('presentation');
    const state = store.getState();

    expect(nextConfig.presentationModeEnabled).toBe(true);
    expect(nextConfig.devModeEnabled).toBe(false);
    expect(state.gameConfig.presentationModeEnabled).toBe(true);
    expect(state.gameConfig.devModeEnabled).toBe(false);
    expect(state.debugTools.debugModeEnabled).toBe(true);
    expect(state.debugTools.logsPanelOpen).toBe(true);
    expect(saveWriter.calls).toEqual(['debug']);
  });

  it('updates difficulty and syncs area resource selection from the central registry', async () => {
    const { controller, saveWriter, store } = buildController();

    await controller.setDifficulty('easy');
    const nextResources = await controller.syncAreaResourceSelection(
      mockIds.areas.crossroads,
    );

    expect(store.getState().gameConfig.difficulty).toBe('easy');
    expect(nextResources?.selectedBackgroundKey).toBe('bg-crossroads');
    expect(nextResources?.selectedBackgroundKey).not.toBe('bg-cinder-crossroads');
    expect(nextResources?.selectedMusicKey).toBe('music-crossroads-watch');
    expect(saveWriter.calls).toEqual(['debug', 'debug']);
  });

  it('toggles loaded resource flags without duplicating keys', async () => {
    const { controller, store } = buildController();

    await controller.setLoadedResource('avatar-ash-warden', true);
    await controller.setLoadedResource('avatar-ash-warden', true);
    const afterLoad = store.getState().resourceState.loadedResourceKeys;

    expect(afterLoad.filter((key) => key === 'avatar-ash-warden')).toHaveLength(1);

    await controller.setLoadedResource('avatar-ash-warden', false);

    expect(store.getState().resourceState.loadedResourceKeys).not.toContain(
      'avatar-ash-warden',
    );
  });
});
