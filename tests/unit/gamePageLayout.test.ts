import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { gameLogStore } from '../../src/core/logging';
import { gameStore } from '../../src/core/state';
import { GamePage } from '../../src/pages/Game/GamePage';

describe('game page main interface layout', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('renders the full PRD-aligned HUD sections', () => {
    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('World Name');
    expect(markup).toContain('Current Area');
    expect(markup).toContain('Time / Weather');
    expect(markup).toContain('Save Status');
    expect(markup).toContain('Minimap / Area Map');
    expect(markup).toContain('Area Switching');
    expect(markup).toContain('Exploration Progress');
    expect(markup).toContain('Main Scene / Area Viewport');
    expect(markup).toContain('NPCs');
    expect(markup).toContain('Interaction Points');
    expect(markup).toContain('Active Quests');
    expect(markup).toContain('Inventory');
    expect(markup).toContain('Player Status');
    expect(markup).toContain('Relationship Indicators');
    expect(markup).toContain('Enemy Alerts');
    expect(markup).toContain('Dialogue Box');
    expect(markup).toContain('Interaction Controls');
    expect(markup).toContain('Logs');
    expect(markup).toContain('Explainability Tips');
    expect(markup).toContain('Manual Save');
    expect(markup).toContain('Phaser-ready');
    expect(markup).toContain('Pixi-ready');
    expect(markup).toContain('DOM layered stage placeholder');
  });
});
