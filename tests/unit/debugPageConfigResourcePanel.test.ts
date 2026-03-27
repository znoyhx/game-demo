import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { gameLogStore } from '../../src/core/logging';
import { gameStore } from '../../src/core/state';
import { DebugPage } from '../../src/pages/Debug/DebugPage';

describe('debug page config resource panel', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('renders standardized debug tabs and anchored tool sections', () => {
    const markup = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/debug' },
        createElement(DebugPage),
      ),
    );

    expect(markup).toContain('pixel-tabs');
    expect(markup).toContain('快捷场景');
    expect(markup).toContain('区域配置');
    expect(markup).toContain('任务');
    expect(markup).toContain('运行日志');
    expect(markup).toContain('id="debug-scenarios"');
    expect(markup).toContain('id="debug-world"');
    expect(markup).toContain('id="debug-quests"');
    expect(markup).toContain('id="debug-events"');
    expect(markup).toContain('id="debug-logs"');
  });
});
