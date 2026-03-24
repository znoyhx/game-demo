import { describe, expect, it } from 'vitest';

import { routeMeta } from '../../src/app/router/routeMeta';
import { formatFeaturePanelStatus } from '../../src/components/layout/featurePanelStatus';
import {
  formatCombatResultLabel,
  formatEnemyTacticLabel,
  formatPlayerTagLabel,
  saveSourceLabels,
} from '../../src/core/utils/displayLabels';
import { locale } from '../../src/core/utils/locale';

describe('locale dictionary', () => {
  it('drives route metadata from the centralized locale definitions', () => {
    expect(routeMeta).toEqual([
      {
        id: 'home',
        path: '/',
        ...locale.routes.home,
      },
      {
        id: 'game',
        path: '/game',
        ...locale.routes.game,
      },
      {
        id: 'debug',
        path: '/debug',
        ...locale.routes.debug,
      },
      {
        id: 'review',
        path: '/review',
        ...locale.routes.review,
      },
    ]);
  });

  it('keeps display label adapters aligned with the locale dictionary', () => {
    expect(formatEnemyTacticLabel('resource-lock')).toBe(
      locale.labels.enemyTactics['resource-lock'],
    );
    expect(formatPlayerTagLabel('speedrun')).toBe(locale.labels.playerTags.speedrun);
    expect(formatCombatResultLabel('victory')).toBe(locale.labels.combatResults.victory);
    expect(saveSourceLabels.debug).toBe(locale.labels.saveSources.debug);
    expect(formatFeaturePanelStatus('ready')).toBe(
      locale.labels.featurePanelStatuses.ready,
    );
  });

  it('exposes reusable page-level formatters for the creation flow', () => {
    expect(locale.pages.home.preview.worldName('余烬')).toBe('余烬之境');
    expect(
      locale.pages.home.preview.storyPremise(
        '余烬之境',
        '像素奇幻前线',
        '稳住最后一条守护回路',
      ),
    ).toBe('余烬之境是一个像素奇幻前线世界，你必须在最终防线崩溃前稳住最后一条守护回路。');
  });
});
