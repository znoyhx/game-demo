import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { describe, expect, it } from 'vitest';

import { HomePage } from '../../src/pages/Home/HomePage';
import { useShellStore } from '../../src/core/state';

describe('home page world creation flow', () => {
  it('renders only the primary home sections by default', () => {
    useShellStore.setState({ developerToolsVisible: false });

    const markup = renderToStaticMarkup(
      createElement(StaticRouter, { location: '/' }, createElement(HomePage)),
    );

    expect(markup).toContain('page-frame--home');
    expect(markup).toContain('pixel-tabs');
    expect(markup).toContain('快速启程');
    expect(markup).toContain('模板预览');
    expect(markup).toContain('自定义世界');
    expect(markup).toContain('id="home-start"');
    expect(markup).toContain('id="home-preview"');
    expect(markup).toContain('id="home-create"');
    expect(markup).toContain('world-creation-form');
    expect(markup).not.toContain('id="home-debug"');
    expect(markup).not.toContain('developer-entry');
  });
});
