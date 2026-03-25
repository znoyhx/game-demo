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

  it('renders the baseline HUD shell', () => {
    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('game-layout');
    expect(markup).toContain('data-renderer="phaser"');
    expect(markup).toContain('data-scene-state="idle"');
    expect(markup).toContain('能量');
  });

  it('renders combat hp summaries while an encounter is active', () => {
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
        name: '灰烬守卫',
        hp: 42,
        maxHp: 90,
      },
      logs: [],
    });

    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('玩家生命');
    expect(markup).toContain('玩家能量');
    expect(markup).toContain('敌方生命');
    expect(markup).toContain('当前战术');
    expect(markup).toContain('当前正处于对话或战斗流程，场景移动暂时锁定');
  });

  it('does not keep the scene locked when only a resolved combat snapshot remains', () => {
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
        name: '灰烬守卫',
        hp: 0,
        maxHp: 90,
      },
      logs: [],
      result: 'victory',
    });

    const markup = renderToStaticMarkup(createElement(GamePage));

    expect(markup).toContain('战斗结果');
    expect(markup).not.toContain('当前正处于对话或战斗流程，场景移动暂时锁定');
  });
});
