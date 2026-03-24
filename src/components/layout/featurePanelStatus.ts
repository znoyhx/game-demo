import type { FeaturePanel } from '../../core/types/appShell';
import { locale } from '../../core/utils/locale';

const featurePanelStatusLabels: Record<FeaturePanel['status'], string> =
  locale.labels.featurePanelStatuses;

export const formatFeaturePanelStatus = (status: FeaturePanel['status']) =>
  featurePanelStatusLabels[status];
