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

    expect(markup).toContain('世界名称');
    expect(markup).toContain('当前区域');
    expect(markup).toContain('时间 / 天候');
    expect(markup).toContain('存档状态');
    expect(markup).toContain('小地图 / 区域图');
    expect(markup).toContain('区域切换');
    expect(markup).toContain('探索进度');
    expect(markup).toContain('主场景 / 区域视窗');
    expect(markup).toContain('区域角色');
    expect(markup).toContain('交互点位');
    expect(markup).toContain('进行中的任务');
    expect(markup).toContain('背包');
    expect(markup).toContain('玩家状态');
    expect(markup).toContain('关系指示');
    expect(markup).toContain('敌情预警');
    expect(markup).toContain('对话框');
    expect(markup).toContain('交互控制');
    expect(markup).toContain('日志');
    expect(markup).toContain('可解释提示');
    expect(markup).toContain('立即保存');
    expect(markup).toContain('data-renderer="phaser"');
    expect(markup).toContain('data-scene-state="idle"');
    expect(markup).toContain('像素场景已启用');
    expect(markup).toContain('方向键移动');
    expect(markup).toContain('空格与当前目标交互');
  });
});
