import { describe, expect, it } from 'vitest';

import { formatFeaturePanelStatus } from '../../src/components/layout/featurePanelStatus';

describe('formatFeaturePanelStatus', () => {
  it('maps internal status enums to Chinese labels', () => {
    expect(formatFeaturePanelStatus('placeholder')).toBe('占位中');
    expect(formatFeaturePanelStatus('planned')).toBe('计划中');
    expect(formatFeaturePanelStatus('ready')).toBe('已就绪');
  });
});
