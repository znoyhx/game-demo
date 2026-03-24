import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AreaSceneStage } from '../../src/components/map/AreaSceneStage';
import { areaSceneStageModelSchema } from '../../src/components/map/areaSceneStage.contract';

describe('area scene stage', () => {
  it('renders renderer-ready layers and interaction markers', () => {
    const model = areaSceneStageModelSchema.parse({
      rendererLabel: 'DOM layered stage placeholder',
      backgroundLabel: 'Town palette',
      engineTargets: ['Phaser-ready', 'Pixi-ready'],
      highlightSummary: '2 live stage highlights',
      stageTone: 'warning',
      layers: [
        {
          id: 'background',
          label: 'Background Layer',
          detail: 'Backdrop placeholder',
          kind: 'background',
          tiles: [
            {
              id: 'sky',
              label: 'Sky',
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
          label: 'Terrain Layer',
          detail: 'Terrain placeholder',
          kind: 'terrain',
          tiles: [
            {
              id: 'ground',
              label: 'Ground',
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
          label: 'Structure Layer',
          detail: 'Structure placeholder',
          kind: 'structures',
          tiles: [
            {
              id: 'roof',
              label: 'Roof',
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
          label: 'Highlight Layer',
          detail: 'Highlight placeholder',
          kind: 'highlights',
          tiles: [
            {
              id: 'glow',
              label: 'Glow',
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
          label: 'Archivist Nera',
          caption: 'Talk / trust',
          glyph: 'NPC',
          typeLabel: 'Npc',
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
          label: 'Storm Bell',
          caption: 'Pending trigger',
          glyph: 'EV',
          typeLabel: 'Event',
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
        { id: 'legend:npc', label: 'NPC lane', tone: 'success' },
        { id: 'legend:event', label: 'Event trigger', tone: 'warning' },
      ],
    });

    const markup = renderToStaticMarkup(
      createElement(AreaSceneStage, {
        areaName: 'Lantern Rest',
        areaType: 'Town',
        model,
        onMarkerActivate: () => {},
      }),
    );

    expect(markup).toContain('DOM layered stage placeholder');
    expect(markup).toContain('Phaser-ready');
    expect(markup).toContain('Pixi-ready');
    expect(markup).toContain('data-layer-kind="terrain"');
    expect(markup).toContain('Archivist Nera');
    expect(markup).toContain('Storm Bell');
  });
});
