import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { describe, expect, it } from 'vitest';

import { HomePage } from '../../src/pages/Home/HomePage';

describe('home page world creation flow', () => {
  it('renders the required creation inputs, presets, and quick actions', () => {
    const markup = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/' },
        createElement(HomePage),
      ),
    );

    expect(markup).toContain('World Creation Module');
    expect(markup).toContain('Game Theme');
    expect(markup).toContain('World Style');
    expect(markup).toContain('Difficulty');
    expect(markup).toContain('Game Goal');
    expect(markup).toContain('Learning Goal (Optional)');
    expect(markup).toContain('Preference');
    expect(markup).toContain('Generate Default World');
    expect(markup).toContain('Quick Play Mode');
    expect(markup).toContain('Dev/Test Mode');
    expect(markup).toContain('Forge Custom World');
    expect(markup).toContain('Prepared Outputs');
  });
});
