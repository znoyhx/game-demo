import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { gameLogStore } from '../../src/core/logging';
import { mockGameConfig } from '../../src/core/mocks/mvp/config';
import {
  defaultWorldCreationRequest,
  worldCreationTemplates,
} from '../../src/core/mocks/worldCreation';
import { gameStore } from '../../src/core/state';
import { locale } from '../../src/core/utils/locale';
import { DebugPage } from '../../src/pages/Debug/DebugPage';
import { GamePage } from '../../src/pages/Game/GamePage';
import { HomePage } from '../../src/pages/Home/HomePage';
import { ReviewPage } from '../../src/pages/Review/ReviewPage';

const englishTokenPattern =
  /\b(?:AI|UI|NPC|LLM|PRD|MVP|DOM)\b|[A-Za-z]{3,}/g;

const extractVisibleText = (markup: string) =>
  markup
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const findEnglishTokens = (text: string) =>
  Array.from(new Set(text.match(englishTokenPattern) ?? []));

const expectNoEnglishTokens = (label: string, text: string) => {
  const tokens = findEnglishTokens(text);
  expect(
    tokens,
    `${label} 仍包含英文内置文案：${tokens.join(', ') || '无'}`,
  ).toEqual([]);
};

describe('strong simplified chinese localization guard', () => {
  beforeEach(() => {
    gameStore.getState().resetToMockSnapshot();
    gameLogStore.getState().clearLogs();
  });

  it('keeps rendered page text free of built-in English copy', () => {
    const pages = [
      {
        label: '首页',
        markup: renderToStaticMarkup(
          createElement(
            StaticRouter,
            { location: '/' },
            createElement(HomePage),
          ),
        ),
      },
      {
        label: '游戏页',
        markup: renderToStaticMarkup(createElement(GamePage)),
      },
      {
        label: '调试页',
        markup: renderToStaticMarkup(
          createElement(
            StaticRouter,
            { location: '/debug' },
            createElement(DebugPage),
          ),
        ),
      },
      {
        label: '复盘页',
        markup: renderToStaticMarkup(createElement(ReviewPage)),
      },
    ];

    pages.forEach(({ label, markup }) => {
      expectNoEnglishTokens(label, extractVisibleText(markup));
    });
  });

  it('keeps reusable localized copy generators and config text in chinese', () => {
    const samples = [
      locale.appLayout.readyWorldStatus('灰烬前哨', '默认存档'),
      locale.pages.home.preview.worldName('余烬'),
      locale.pages.home.preview.storyPremise(
        '余烬之境',
        '像素奇幻前线',
        '稳住最后一道守护回路',
      ),
      locale.pages.debug.areaTools.lockStatusLabel('已解锁'),
      locale.pages.debug.renderLab.forcedBadge('沉没秘库'),
      locale.pages.review.telemetry.eyebrow(3),
      locale.controllers.worldCreation.playerModelRationale.devMode,
      locale.logging.npcInteractionSummary,
      locale.logging.agentDecisionSummary(locale.labels.agentLabels['npc-brain']),
      defaultWorldCreationRequest.theme,
      defaultWorldCreationRequest.worldStyle,
      defaultWorldCreationRequest.gameGoal,
      defaultWorldCreationRequest.learningGoal ?? '',
      defaultWorldCreationRequest.promptStyle ?? '',
      mockGameConfig.theme,
      mockGameConfig.worldStyle,
      mockGameConfig.gameGoal,
      mockGameConfig.learningGoal ?? '',
      mockGameConfig.storyPremise ?? '',
      ...worldCreationTemplates.flatMap((template) => [template.label, template.description]),
    ];

    samples.forEach((sample, index) => {
      expectNoEnglishTokens(`本地化样本文案 #${index + 1}`, sample);
    });
  });
});
