import type { FeaturePanel } from '../../core/types/appShell';
import { SectionCard } from '../layout/SectionCard';

interface NpcPanelProps {
  panel: FeaturePanel;
}

export function NpcPanel({ panel }: NpcPanelProps) {
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
