import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { gameLogStore } from '../../src/core/logging';
import { mockIds } from '../../src/core/mocks/mvp';
import { gameStore } from '../../src/core/state';
import { GamePage } from '../../src/pages/Game/GamePage';

describe('game page main interface layout', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('renders the standardized HUD shell and anchor sections', () => {
    const markup = renderToStaticMarkup(createElement(GamePage));
    const dialogueIndex = markup.indexOf('id="game-dialogue"');
    const railIndex = markup.indexOf('game-layout__rail');

    expect(markup).toContain('game-layout');
    expect(markup).toContain('game-layout__tabs');
    expect(markup).toContain('game-layout__main');
    expect(markup).toContain('game-layout__primary');
    expect(markup).toContain('game-layout__dialogue');
    expect(markup).toContain('game-layout__rail');
    expect(markup).toContain('game-layout__support');
    expect(markup).toContain('id="game-scene"');
    expect(markup).toContain('id="game-journey"');
    expect(markup).toContain('id="game-status"');
    expect(markup).toContain('id="game-dialogue"');
    expect(markup).not.toContain('game-bottom-dock');
    expect(dialogueIndex).toBeGreaterThan(-1);
    expect(railIndex).toBeGreaterThan(-1);
    expect(dialogueIndex).toBeLessThan(railIndex);
    expect(markup).toContain('ui-list-card--quest');
    expect(markup).toContain('ui-list-card--npc');
    expect(markup).toContain('ui-list-card--review');
    expect(markup).toContain('data-renderer="phaser"');
    expect(markup).toContain('data-scene-state="idle"');
  });

  it('renders combat action controls and hp summaries while an encounter is active', () => {
    gameStore.getState().setCombatState({
      encounterId: mockIds.encounter,
      turn: 3,
      currentPhaseId: 'phase:sealed-guard',
      activeTactic: 'trap',
      player: {
        id: 'combatant:player',
        name: '玩家',
        hp: 18,
        maxHp: 30,
      },
      enemy: {
        id: 'combatant:enemy',
        name: '首领',
        hp: 42,
        maxHp: 90,
      },
      logs: [],
    });

    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('18 / 30');
    expect(markup).toContain('42 / 90');
    expect(markup).toContain('攻击');
    expect(markup).toContain('撤退');
  });

  it('returns to standard controls when only a resolved combat snapshot remains', () => {
    gameStore.getState().setCombatState({
      encounterId: mockIds.encounter,
      turn: 5,
      currentPhaseId: 'phase:embers-unbound',
      activeTactic: 'counter',
      player: {
        id: 'combatant:player',
        name: '玩家',
        hp: 9,
        maxHp: 30,
      },
      enemy: {
        id: 'combatant:enemy',
        name: '首领',
        hp: 0,
        maxHp: 90,
      },
      logs: [],
      result: 'victory',
    });

    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('9 / 30');
    expect(markup).toContain('0 / 90');
    expect(markup).not.toContain('攻击');
    expect(markup).toContain('手动存档');
  });
});
