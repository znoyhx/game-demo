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

    expect(markup).toContain('世界创建模块');
    expect(markup).toContain('游戏主题');
    expect(markup).toContain('世界风格');
    expect(markup).toContain('难度');
    expect(markup).toContain('游戏目标');
    expect(markup).toContain('学习目标（可选）');
    expect(markup).toContain('偏好');
    expect(markup).toContain('一键生成默认世界');
    expect(markup).toContain('快速开局');
    expect(markup).toContain('开发/测试模式');
    expect(markup).toContain('生成自定义世界');
    expect(markup).toContain('预计生成结果');
  });
});
