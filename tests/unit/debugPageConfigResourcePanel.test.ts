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

  it('renders the config and resource debug panel on the debug route', () => {
    const markup = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/debug' },
        createElement(DebugPage),
      ),
    );

    expect(markup).toContain('配置与资源调试');
    expect(markup).toContain('资源注册表检查');
    expect(markup).toContain('同步当前区域资源选择');
  });
});
