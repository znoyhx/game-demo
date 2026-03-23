import type { FeaturePanel } from '../../core/types/appShell';
import { SectionCard } from '../layout/SectionCard';

interface DebugPanelProps {
  panel: FeaturePanel;
}

export function DebugPanel({ panel }: DebugPanelProps) {
  return (
    <SectionCard
      title={panel.title}
      eyebrow={panel.status}
      description={panel.description}
      footer={panel.footer}
    >
      <ul className="section-card__list">
        {panel.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </SectionCard>
  );
}
