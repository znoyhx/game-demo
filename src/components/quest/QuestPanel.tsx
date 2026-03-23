import type { FeaturePanel } from '../../core/types/appShell';
import { SectionCard } from '../layout/SectionCard';

interface QuestPanelProps {
  panel: FeaturePanel;
}

export function QuestPanel({ panel }: QuestPanelProps) {
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
