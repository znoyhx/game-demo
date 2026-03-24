import { Badge } from '../pixel-ui/Badge';
import { GamePanel } from '../game/GamePanel';

interface QuestViewModel {
  id: string;
  title: string;
  status: string;
  objective: string;
  progress: string;
}

interface QuestTrackerPanelProps {
  quests: QuestViewModel[];
  className?: string;
}

export function QuestTrackerPanel({
  quests,
  className,
}: QuestTrackerPanelProps) {
  return (
    <GamePanel
      title="Active Quests"
      eyebrow="Quest Tracker"
      description="Current mainline and side progression with visible objective state."
      className={className}
    >
      <div className="game-list">
        {quests.map((quest) => (
          <article key={quest.id} className="game-list__card">
            <div className="game-list__card-header">
              <strong>{quest.title}</strong>
              <Badge tone="info">{quest.status}</Badge>
            </div>
            <p>{quest.objective}</p>
            <span>{quest.progress}</span>
          </article>
        ))}
      </div>
    </GamePanel>
  );
}
