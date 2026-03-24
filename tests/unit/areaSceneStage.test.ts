import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AreaSceneStage } from '../../src/components/map/AreaSceneStage';
import { areaSceneStageModelSchema } from '../../src/components/map/areaSceneStage.contract';

describe('area scene stage', () => {
  it('renders renderer-ready layers and interaction markers', () => {
    const model = areaSceneStageModelSchema.parse({
      rendererLabel: '分层舞台占位渲染',
      backgroundLabel: '城镇主色板',
      engineTargets: ['场景引擎预留', '像素渲染预留'],
      highlightSummary: '2 处实时舞台高亮',
      stageTone: 'warning',
      layers: [
        {
          id: 'background',
          label: '背景层',
          detail: '背景占位层',
          kind: 'background',
          tiles: [
            {
              id: 'sky',
              label: '天空',
              variant: 'sky',
              tone: 'info',
              animation: 'shimmer',
              xPercent: 0,
              yPercent: 0,
              widthPercent: 100,
              heightPercent: 40,
            },
          ],
        },
        {
          id: 'terrain',
          label: '地形层',
          detail: '地形占位层',
          kind: 'terrain',
          tiles: [
            {
              id: 'ground',
              label: '地面',
              variant: 'ground',
              tone: 'default',
              animation: 'none',
              xPercent: 0,
              yPercent: 60,
              widthPercent: 100,
              heightPercent: 40,
            },
          ],
        },
        {
          id: 'structures',
          label: '结构层',
          detail: '结构占位层',
          kind: 'structures',
          tiles: [
            {
              id: 'roof',
              label: '屋顶',
              variant: 'roof',
              tone: 'warning',
              animation: 'none',
              xPercent: 20,
              yPercent: 28,
              widthPercent: 20,
              heightPercent: 20,
            },
          ],
        },
        {
          id: 'highlights',
          label: '高亮层',
          detail: '高亮占位层',
          kind: 'highlights',
          tiles: [
            {
              id: 'glow',
              label: '辉光',
              variant: 'glow',
              tone: 'warning',
              animation: 'pulse',
              xPercent: 50,
              yPercent: 40,
              widthPercent: 14,
              heightPercent: 14,
            },
          ],
        },
      ],
      markers: [
        {
          id: 'marker:npc',
          label: '档案守望者内拉',
          caption: '对话 / 信任',
          glyph: '角',
          typeLabel: '角色',
          type: 'npc',
          targetId: 'npc:nera',
          enabled: true,
          xPercent: 42,
          yPercent: 56,
          feedbackTone: 'success',
          state: 'focus',
        },
        {
          id: 'marker:event',
          label: '风暴警钟',
          caption: '待触发',
          glyph: '事',
          typeLabel: '事件',
          type: 'event',
          targetId: 'event:storm-bell',
          enabled: true,
          xPercent: 68,
          yPercent: 32,
          feedbackTone: 'warning',
          state: 'alert',
        },
      ],
      legend: [
        { id: 'legend:npc', label: '角色通道', tone: 'success' },
        { id: 'legend:event', label: '事件触发', tone: 'warning' },
      ],
    });

    const markup = renderToStaticMarkup(
      createElement(AreaSceneStage, {
        areaName: '灯栖镇',
        areaType: '城镇',
        model,
        onMarkerActivate: () => {},
      }),
    );

    expect(markup).toContain('分层舞台占位渲染');
    expect(markup).toContain('场景引擎预留');
    expect(markup).toContain('像素渲染预留');
    expect(markup).toContain('data-layer-kind="terrain"');
    expect(markup).toContain('档案守望者内拉');
    expect(markup).toContain('风暴警钟');
  });
});
