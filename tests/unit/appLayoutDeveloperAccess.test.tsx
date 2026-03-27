import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { findRouteMeta } from '../../src/app/router/routeMeta';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useShellStore } from '../../src/core/state';

const renderShell = (path = '/') =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(
          Route,
          { path: '/', element: createElement(AppLayout) },
          createElement(Route, { index: true, element: createElement('div', null, '首页内容') }),
          createElement(Route, { path: 'game', element: createElement('div', null, '游戏内容') }),
          createElement(Route, { path: 'review', element: createElement('div', null, '回顾内容') }),
          createElement(Route, { path: 'debug', element: createElement('div', null, '调试内容') }),
        ),
      ),
    ),
  );

afterEach(() => {
  useShellStore.setState({
    currentRoute: findRouteMeta('/'),
    developerToolsVisible: false,
  });
});

describe('app layout developer access', () => {
  it('keeps the primary navigation focused on home, game, and review', () => {
    useShellStore.setState({
      currentRoute: findRouteMeta('/'),
      developerToolsVisible: false,
    });

    const markup = renderShell('/');

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/game"');
    expect(markup).toContain('href="/review"');
    expect(markup).not.toContain('href="/debug"');
    expect(markup).not.toContain('开发者入口已启用');
  });

  it('shows the hidden developer dock only after developer mode is enabled', () => {
    useShellStore.setState({
      currentRoute: findRouteMeta('/'),
      developerToolsVisible: true,
    });

    const markup = renderShell('/');

    expect(markup).toContain('开发者入口已启用');
    expect(markup).toContain('开发模式');
    expect(markup).toContain('href="/debug"');
  });
});
