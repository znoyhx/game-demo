import { describe, expect, it } from 'vitest';

import { resolveGameEventActivationMessage } from '../../src/pages/Game/gameEventInteractionMessages';

describe('game event interaction messages', () => {
  it('returns a preview-only message when forced render is active', () => {
    expect(
      resolveGameEventActivationMessage({
        isForcedRender: true,
        previewAreaName: '余烬圣所',
      }),
    ).toBe('当前正在预览“余烬圣所”，不会真正触发事件。请先退出预览后再操作。');
  });

  it('returns the localized blocked reason during normal gameplay', () => {
    expect(
      resolveGameEventActivationMessage({
        isForcedRender: false,
        naturalReason: '需要在“暮色将尽”时触发。',
      }),
    ).toBe('当前无法触发：需要在“暮色将尽”时触发。');
  });
});
